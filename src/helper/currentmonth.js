export const getCurrentMonthFilter = () => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = now;

    return { startOfMonth, endOfMonth };
};