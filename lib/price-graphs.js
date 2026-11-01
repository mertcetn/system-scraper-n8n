const GRAPH_DAY = 86400000;
function graphLocalDay(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) throw new Error('Invalid graph observation timestamp');
  return new Date(time + 3 * 3600000).toISOString().slice(0, 10);
}
function graphWeek(day) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
function graphDayShift(day, amount) {
  return new Date(new Date(day + 'T00:00:00Z').getTime() + amount * GRAPH_DAY).toISOString().slice(0, 10);
}
function readGraphHistory(raw) {
  if (!raw) return {version: 1, daily: [], weekly: [], monthly: []};
  const history = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (history.version !== 1 || !['daily', 'weekly', 'monthly'].every(key => Array.isArray(history[key]))) {
    throw new Error('Invalid stored chart_history');
  }
  for (const key of ['daily', 'weekly', 'monthly']) {
    for (const point of history[key]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(point.day) || !Number.isFinite(point.price) || point.price <= 0 || !Number.isFinite(Date.parse(point.observed_at))) {
        throw new Error('Invalid stored price point');
      }
    }
  }
  return JSON.parse(JSON.stringify(history));
}
function addGraphObservation(raw, product, timestamp, reset = false) {
  const previous = readGraphHistory(raw);
  const history = reset ? readGraphHistory(null) : previous;
  if (reset && previous.monthly.length) {
    history.archived = [...(previous.archived || []), {monthly: previous.monthly}];
  }
  const day = graphLocalDay(timestamp);
  const week = graphWeek(day);
  const month = day.slice(0, 7) + '-01';
  history.daily = history.daily.filter(point => point.day >= graphDayShift(day, -6));
  history.weekly = history.weekly.filter(point => point.day >= graphWeek(graphDayShift(day, -30)));
  const price = Number(product.current_price);
  if (product.in_stock === true && Number.isFinite(price) && price > 0) {
    for (const [key, bucket] of [['daily', day], ['weekly', week], ['monthly', month]]) {
      const existing = history[key].find(point => point.day === bucket);
      const rounded = Math.round(price * 100) / 100;
      if (existing && (rounded < existing.price || (rounded === existing.price && timestamp < existing.observed_at))) {
        existing.price = rounded;
        existing.observed_at = timestamp;
      } else if (!existing) history[key].push({day: bucket, price: rounded, observed_at: timestamp});
      history[key].sort((a, b) => a.day.localeCompare(b.day));
    }
  }
  return JSON.stringify(history);
}
function graphSeries(raw, period, timestamp) {
  const history = readGraphHistory(raw);
  const today = graphLocalDay(timestamp);
  let buckets;
  let points;
  if (period === 'week') {
    buckets = Array.from({length: 7}, (_, i) => graphDayShift(today, i - 6));
    points = history.daily;
  } else if (period === 'month') {
    const start = graphWeek(graphDayShift(today, -30));
    buckets = [];
    for (let day = start; day <= today; day = graphDayShift(day, 7)) buckets.push(day);
    points = history.weekly;
  } else if (period === 'year' || period === 'max') {
    const first = period === 'year'
      ? new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 12, 1)).toISOString().slice(0, 10)
      : (history.monthly[0]?.day || today.slice(0, 7) + '-01');
    buckets = [];
    for (let day = first; day <= today;) {
      buckets.push(day);
      const date = new Date(day + 'T00:00:00Z');
      date.setUTCMonth(date.getUTCMonth() + 1);
      day = date.toISOString().slice(0, 10);
    }
    points = history.monthly;
  } else throw new Error('Invalid graph period');
  const byDay = new Map(points.map(point => [point.day, point.price]));
  const included = points.filter(point => buckets.includes(point.day));
  const minimum = included.slice().sort((a, b) => a.price - b.price || a.observed_at.localeCompare(b.observed_at))[0] || null;
  return {labels: buckets.map(day => period === 'week' || period === 'month' ? day : day.slice(0, 7)), values: buckets.map(day => byDay.get(day) ?? null), minimum};
}
function priceChartConfig(raw, period, timestamp) {
  const series = graphSeries(raw, period, timestamp);
  const titles = {week: '1 Hafta · Günlük En Düşük Fiyat', month: '1 Ay · Haftalık En Düşük Fiyat', year: '1 Yıl · Aylık En Düşük Fiyat', max: 'Max · Aylık En Düşük Fiyat'};
  const caption = series.minimum ? 'En düşük: ' + series.minimum.price.toLocaleString('tr-TR') + ' TL · ' + graphLocalDay(series.minimum.observed_at) : 'Bu dönem için kayıtlı fiyat yok';
  return {type: 'line', data: {labels: series.labels, datasets: [{label: 'En düşük fiyat (TL)', data: series.values, borderColor: '#4f8cff', backgroundColor: '#4f8cff', fill: false, tension: 0, spanGaps: false, pointRadius: 4}]}, options: {plugins: {title: {display: true, text: titles[period]}, subtitle: {display: true, position: 'bottom', text: caption, padding: 12}, legend: {display: false}}, scales: {y: {beginAtZero: false, title: {display: true, text: 'TL'}}}}};
}
if (typeof module !== 'undefined') module.exports = {graphLocalDay, graphWeek, readGraphHistory, addGraphObservation, graphSeries, priceChartConfig};
