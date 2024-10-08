<!--
SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div v-if="store.loading">Loading...</div>
  <div v-else class="row">
    <BaseColumn
      :font-color="props.fontColor"
      :title="t(columnsData[0].columnTitle)"
      :value="columnsData[0].columnValue"
      :unit="columnsData[0].columnUnit"
      :sources="props.activeSources"
      :slots-count="2"
      @update:index="(index) => updateColumnsData(0, index)">
      <template #slide-0>
        <LineChartContainer :title="'Zeitraum'" :row-data="kmTotalRowData" />
      </template>
      <template #slide-1>
        <LineChartContainer
          :title="'Zeitraum'"
          :row-data="numberOfPeopleRowData" />
      </template>
    </BaseColumn>
    <BaseColumn
      :font-color="props.fontColor"
      :title="t(columnsData[1].columnTitle)"
      :value="columnsData[1].columnValue"
      :unit="columnsData[1].columnUnit"
      :sources="props.activeSources"
      :slots-count="2"
      @update:index="(index) => updateColumnsData(1, index)">
      <template #slide-0>
        <LineChartContainer :title="'Zeitraum'" :row-data="co2RowData" />
      </template>
      <template #slide-1>
        <LineChartContainer :title="'Zeitraum'" :row-data="moneySavedRowData" />
      </template>
    </BaseColumn>
    <BaseColumn
      :font-color="props.fontColor"
      :title="t(columnsData[2].columnTitle)"
      :value="columnsData[2].columnValue"
      :sources="props.activeSources"
      :slots-count="4"
      @update:index="(index) => updateColumnsData(2, index)">
      <template #slide-0>
        <SearchContainer
          :title="t('overall-ranking')"
          :selected-organisation="props.selectedOrganisation"
          :sorted-organisations="sortedKmTotalOrganisations" />
      </template>
      <template #slide-1>
        <SearchContainer
          :title="t('overall-ranking')"
          :selected-organisation="props.selectedOrganisation"
          :sorted-organisations="sortedCo2Organisations" />
      </template>
      <template #slide-2>
        <SearchContainer
          :title="t('overall-ranking')"
          :selected-organisation="props.selectedOrganisation"
          :sorted-organisations="sortedNumberOfPeopleOrganisations" />
      </template>
      <template #slide-3>
        <SearchContainer
          :title="t('overall-ranking')"
          :selected-organisation="props.selectedOrganisation"
          :sorted-organisations="sortedMoneySavedOrganisations"
      /></template>
    </BaseColumn>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch, reactive } from 'vue';
import BaseColumn from '@/components/library/BaseColumn.vue';
import LineChartContainer from '@/components/containers/LineChartContainer.vue';
import SearchContainer from '@/components/containers/SearchContainer.vue';
import { suedtirolRadeltStore } from '@/stores/suedtirolRadeltStore';
import { useI18n } from 'vue-i18n';

interface Props {
  activeSources: string[];
  fontColor: string;
  selectedOrganisation?: string;
}

const props = defineProps<Props>();
const store = suedtirolRadeltStore();
const { t } = useI18n();

onMounted(() => {
  store.loadCompanyGamificationActions();
});

const formatValue = (value: number, minDigits: number, maxDigits: number) =>
  value.toLocaleString('de-DE', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });

const filterOrganisations = () =>
  Object.fromEntries(
    Object.entries(store.organisations)
      .filter(
        ([, org]) =>
          !props.selectedOrganisation ||
          org.sname.toLowerCase() === props.selectedOrganisation.toLowerCase()
      )
      .filter(
        ([key]) =>
          !store.selectedActionFilter ||
          key.includes(store.selectedActionFilter)
      )
  );

const calculateTotalValue = (
  metric: string,
  minDigits: number,
  maxDigits: number
): string => {
  const total = Object.values(filterOrganisations()).reduce(
    (sum, organisation) => {
      const valueEntry = organisation.values.find((v) => v.tname === metric);

      return sum + (valueEntry?.totalMValue || 0);
    },
    0
  );

  return formatValue(total, minDigits, maxDigits);
};

const kmTotal = computed(() => calculateTotalValue('km_total', 0, 2));
const co2 = computed(() => calculateTotalValue('co2', 0, 2));
const numberOfPeople = computed(() =>
  calculateTotalValue('number_of_people', 0, 0)
);
const moneySaved = computed(() => calculateTotalValue('money_saved', 2, 2));

const generateRowData = (
  metric: string,
  minDigits: number,
  maxDigits: number
) => {
  const filters = store.selectedActionFilter
    ? [store.selectedActionFilter]
    : Array.from(store.actionFilters);

  return filters.map((actionFilter) => {
    const filteredData = Object.entries(filterOrganisations())
      .filter(([key]) => key.includes(actionFilter))
      .reduce(
        (acc, [, organisation]) => {
          const valueEntry = organisation.values.find(
            (v) => v.tname === metric
          );

          if (valueEntry) {
            acc.value += valueEntry.totalMValue || 0;
            acc.unit = valueEntry.tunit || acc.unit;
          }

          return acc;
        },
        { value: 0, unit: '' }
      );

    return {
      label: actionFilter,
      value: formatValue(filteredData.value, minDigits, maxDigits),
      unit: metric !== 'number_of_people' ? filteredData.unit : '',
    };
  });
};

const kmTotalRowData = computed(() => generateRowData('km_total', 0, 2));
const co2RowData = computed(() => generateRowData('co2', 0, 2));
const numberOfPeopleRowData = computed(() =>
  generateRowData('number_of_people', 0, 0)
);
const moneySavedRowData = computed(() => generateRowData('money_saved', 2, 2));

const sortOrganisations = (metric: string) => {
  const filteredOrganisations = Object.entries(store.organisations ?? {})
    .filter(
      ([key]) =>
        !store.selectedActionFilter || key.includes(store.selectedActionFilter)
    )
    .map(([, org]) => org);

  const orgMap = filteredOrganisations.reduce(
    (acc, org) => {
      const entry = org.values.find((value) => value.tname === metric);

      if (entry) {
        if (!acc[org.sname]) {
          acc[org.sname] = {
            sname: org.sname,
            totalMValue: entry.totalMValue ?? 0,
            tunit: metric !== 'number_of_people' ? entry.tunit : '',
          };
        } else {
          acc[org.sname].totalMValue += entry.totalMValue ?? 0;
        }
      }

      return acc;
    },
    {} as Record<string, { sname: string; totalMValue: number; tunit: string }>
  );

  return Object.values(orgMap).sort((a, b) => b.totalMValue - a.totalMValue);
};

const sortedKmTotalOrganisations = computed(() =>
  sortOrganisations('km_total')
);
const sortedCo2Organisations = computed(() => sortOrganisations('co2'));
const sortedNumberOfPeopleOrganisations = computed(() =>
  sortOrganisations('number_of_people')
);
const sortedMoneySavedOrganisations = computed(() =>
  sortOrganisations('money_saved')
);

const columnDefinitions = [
  {
    titles: ['kilometres-travelled', 'participants'],
    units: ['km', ''],
    values: [kmTotal, numberOfPeople],
  },
  {
    titles: ['co2-saved', 'money-saved'],
    units: ['kg', 'EUR'],
    values: [co2, moneySaved],
  },
  {
    titles: [
      'kilometres-travelled',
      'co2-saved',
      'participants',
      'money-saved',
    ],
    units: ['', '', '', ''],
    values: [
      computed(() => sortedKmTotalOrganisations.value[0]?.sname ?? ''),
      computed(() => sortedCo2Organisations.value[0]?.sname ?? ''),
      computed(() => sortedNumberOfPeopleOrganisations.value[0]?.sname ?? ''),
      computed(() => sortedMoneySavedOrganisations.value[0]?.sname ?? ''),
    ],
  },
];

const columnsData = reactive(
  columnDefinitions.map((dataSet) => ({
    columnTitle: dataSet.titles[0],
    columnValue: dataSet.values[0].value,
    columnUnit: dataSet.units[0],
  }))
);

const updateColumnsData = (setIndex: number, itemIndex: number) => {
  const { titles, values, units } = columnDefinitions[setIndex];
  columnsData[setIndex].columnTitle = titles[itemIndex];
  columnsData[setIndex].columnValue = values[itemIndex].value;
  columnsData[setIndex].columnUnit = units[itemIndex];
};

watch([() => store.organisations, () => store.selectedActionFilter], () => {
  columnsData[0].columnValue = kmTotal.value;
  columnsData[1].columnValue = co2.value;
  columnsData[2].columnValue = sortedKmTotalOrganisations.value[0]?.sname ?? '';
});
</script>
