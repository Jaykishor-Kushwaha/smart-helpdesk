export const notify = async ({ to, subject, text }) => {
  console.log(`[NOTIFY] to=${to} subject=${subject} body=${text.slice(0,120)}...`);
};