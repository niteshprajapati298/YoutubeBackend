// src/validators/user.validator.js

const validateRegister = (data) => {
    const errors = [];
    if (!data.username?.trim()) errors.push("Username is required");
    if (!data.email?.trim()) errors.push("Email is required");
    if (!data.fullName?.trim()) errors.push("Full name is required");
    if (!data.password) errors.push("Password is required");
    if (!data.avatar || typeof data.avatar !== "string" || !data.avatar.trim()) {
        errors.push("Avatar is required");
    } const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
        errors.push("Invalid email format");
    }

    if (data.password && data.password.length < 6) {
        errors.push("Password must be at least 6 characters");
    }

    return errors;
};

const validateLogin = (data) => {
    const errors = []
    if (!data.email?.trim()) errors.push("Email is required");

    if (!data.password) errors.push("Password is required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
        errors.push("Invalid email format");
    }
    if (data.password && data.password.length < 6) {
        errors.push("Password must be at least 6 characters");
    }
    return errors;
};

export { validateRegister, validateLogin };