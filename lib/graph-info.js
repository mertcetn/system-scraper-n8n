function buildGraphInfo(row, request, endpoint, timestamp) {
  const responseType = request.graphUpdate === true ? 7 : 4;
  const reply = content => ({type:responseType,data:{content,embeds:[],components:[]}});
  if (row.error) return reply('Fiyat geçmişi şu anda okunamıyor. Lütfen tekrar deneyin.');
  if (!row.product_id) return reply('Bu sistem artık bulunamıyor. /ara ile yeniden arayın.');
  try {
    const periods = {week:'1 Hafta',month:'1 Ay',year:'1 Yıl',max:'Max'};
    const period = Object.hasOwn(periods,request.period) ? request.period : 'week';
    const series = graphSeries(row.chart_history,period,timestamp);
    const minimum = series.minimum;
    const embed = {
      title:periods[period]+' · Fiyat Geçmişi',
      color:0x42d1bf,
      image:{url:endpoint+'?id='+row.id+'&period='+period+'&style=3&v='+encodeURIComponent(row.updatedAt || row.last_checked_at || '')},
      footer:{text:minimum ? 'En düşük: '+minimum.price.toLocaleString('tr-TR')+' TL · Görüldüğü gün: '+graphLocalDay(minimum.observed_at) : 'Bu dönem için kayıtlı fiyat yok'}
    };
    return {type:responseType,data:{
      content:'**'+String(row.product_name).slice(0,250)+'**',
      embeds:[embed],
      components:[{type:1,components:Object.entries(periods).map(([value,label])=>({
        type:2,style:value===period?1:2,label,custom_id:'price_graph:'+row.id+':'+value,disabled:value===period
      }))}]
    }};
  } catch (error) {return reply('Fiyat geçmişi verisi okunamadı. Kayıt formatı kontrol edilmeli.');}
}
if (typeof module !== 'undefined') module.exports = {buildGraphInfo};
