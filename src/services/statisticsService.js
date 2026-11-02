// Future statistics-provider contract. Never substitute synthetic data.
export const unavailableStatisticsService = {
  async getStatistics() { return { status: 'unavailable', source: null, updatedAt: null, records: [] }; },
};
