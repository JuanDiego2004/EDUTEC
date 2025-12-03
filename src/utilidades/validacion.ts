export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidDni = (dni: string): boolean => {
    return /^\d{8}$/.test(dni);
};

export const isValidPhone = (phone: string): boolean => {
    return /^\d{9}$/.test(phone);
};
