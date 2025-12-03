export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(amount);
};

export const formatDate = (date: string | Date): string => {
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(date));
};
