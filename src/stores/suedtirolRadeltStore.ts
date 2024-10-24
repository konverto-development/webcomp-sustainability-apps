// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { defineStore } from 'pinia';
import { fetchCompanyGamificationActions } from '@/api/suedtirolRadeltApi';

interface AggregatedData {
  sname: string;
  values: {
    tname: string;
    tunit: string;
    totalMValue: number;
  }[];
}

interface State {
  organisations: Record<string, AggregatedData>;
  actionFilters: Set<string>;
  organizationFilters: Set<string>;
  selectedActionFilter?: string;
  selectedOrganizationFilter?: string;
  loading: boolean;
  error: string | null;
}

export const suedtirolRadeltStore = defineStore('suedtirol-radelt-store', {
  state: (): State => ({
    organisations: {},
    actionFilters: new Set<string>(),
    organizationFilters: new Set<string>(),
    loading: false,
    error: null,
  }),
  actions: {
    setSelectedActionFilter(newFilter?: string) {
      this.selectedActionFilter = newFilter;
    },
    setSelectedOrganizationFilter(newFilter?: string) {
      this.selectedOrganizationFilter = newFilter;
    },
    async loadCompanyGamificationActions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetchCompanyGamificationActions();

        this.organisations = response.reduce(
          (organisations, item) => {
            // Only these data fields are relevant
            if (
              item.tname === 'km_total' ||
              item.tname === 'co2' ||
              item.tname === 'number_of_people' ||
              item.tname === 'money_saved'
            ) {
              const organisationName = item.sname
                .split('-')
                .slice(0, -1)
                .join('-');

              if (!organisations[item.sname]) {
                organisations[item.sname] = {
                  sname: organisationName,
                  values: [],
                };
              }

              const existingEntry = organisations[item.sname].values.find(
                (v) => v.tname === item.tname
              );

              if (existingEntry) {
                existingEntry.totalMValue += item.mvalue;
              } else {
                organisations[item.sname].values.push({
                  tname: item.tname,
                  tunit: item.tunit,
                  totalMValue: item.mvalue,
                });
              }
            }

            return organisations;
          },
          {} as Record<string, AggregatedData>
        );

        this.actionFilters = new Set(
          Object.keys(this.organisations).reduce(
            (lastParts: string[], key: string) => {
              const lastPart = key.split('-').pop();
              if (lastPart) {
                lastParts.push(lastPart);
              }
              return lastParts;
            },
            []
          )
        );
        this.organizationFilters = new Set(
          Object.keys(this.organisations).reduce(
            (firstParts: string[], key: string) => {
              const firstPart = key.split('-').slice(0, -1).join('-');
              if (firstPart) {
                firstParts.push(firstPart);
              }
              return firstParts;
            },
            []
          )
        );
      } catch (error) {
        this.error = 'Failed to fetch data';
        console.error('Error loading data:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
