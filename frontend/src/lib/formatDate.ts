export const formatDate = (dateStr: string) => {
  if (!dateStr) return dateStr;
  if (dateStr.includes('Today')) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    // Use manual month array to ensure "Sept" instead of "Sep"
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateStr;
  }
};
