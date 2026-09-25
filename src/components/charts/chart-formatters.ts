/** Formatadores dos gráficos Bklit, ajustados para pt-BR. */
export const shortDateFmt = {
  format: (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })
      .format(date)
      .replace(".", ""),
};

export const weekdayDateFmt = {
  format: (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
      .format(date)
      .replace(/\./g, ""),
};

export const hmsTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const intFmt = new Intl.NumberFormat("pt-BR").format;
