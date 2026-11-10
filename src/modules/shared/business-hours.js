// Horário de funcionamento dos restaurantes ("HH:MM").
// Os horários são do fuso do restaurante (padrão: horário de Brasília).

const TIME_ZONE = process.env.EASYFOOD_TIMEZONE || "America/Sao_Paulo";
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value) {
    return typeof value === "string" && TIME_REGEX.test(value);
}

function toMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

// Hora atual no fuso do restaurante, em minutos desde a meia-noite
function nowInMinutes(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const get = type => Number(parts.find(part => part.type === type).value);

    return get("hour") * 60 + get("minute");
}

/**
 * Sem horário cadastrado = sempre aberto.
 * Aceita horário que vira a noite (ex.: 18:00 às 02:00).
 */
function isOpenNow(opensAt, closesAt, date = new Date()) {
    if (!opensAt || !closesAt) {
        return true;
    }

    const now = nowInMinutes(date);
    const open = toMinutes(opensAt);
    const close = toMinutes(closesAt);

    if (open === close) {
        return true; // 24 horas
    }

    return open < close
        ? now >= open && now < close
        : now >= open || now < close;
}

module.exports = {
    TIME_ZONE,
    isValidTime,
    isOpenNow
};
