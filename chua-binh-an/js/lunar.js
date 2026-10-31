/* =========================================================================
 *  LỊCH ÂM VIỆT NAM (thuật toán thiên văn của Hồ Ngọc Đức, múi giờ +7)
 *  + bảng ngày lễ Phật giáo để nhân điểm.
 * ========================================================================= */
window.CBA = window.CBA || {};

CBA.Lunar = (() => {
  const PI = Math.PI, F = Math.floor;
  function jd(dd, mm, yy) {
    const a = F((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    let j = dd + F((153 * m + 2) / 5) + 365 * y + F(y / 4) - F(y / 100) + F(y / 400) - 32045;
    if (j < 2299161) j = dd + F((153 * m + 2) / 5) + 365 * y + F(y / 4) - 32083;
    return j;
  }
  function newMoon(k, tz) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let J = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    J += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mp = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const Fm = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C += -0.4068 * Math.sin(Mp * dr) + 0.0161 * Math.sin(dr * 2 * Mp) - 0.0004 * Math.sin(dr * 3 * Mp);
    C += 0.0104 * Math.sin(dr * 2 * Fm) - 0.0051 * Math.sin(dr * (M + Mp)) - 0.0074 * Math.sin(dr * (M - Mp));
    C += 0.0004 * Math.sin(dr * (2 * Fm + M)) - 0.0004 * Math.sin(dr * (2 * Fm - M)) - 0.0006 * Math.sin(dr * (2 * Fm + Mp));
    C += 0.0010 * Math.sin(dr * (2 * Fm - Mp)) + 0.0005 * Math.sin(dr * (2 * Mp + M));
    const dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return F(J + C - dt + 0.5 + tz / 24);
  }
  function sunLong(j, tz) {
    const T = (j - 2451545.5 - tz / 24) / 36525, T2 = T * T, dr = PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr; L -= PI * 2 * F(L / (PI * 2));
    return F(L / PI * 6);
  }
  function month11(yy, tz) {
    const k = F((jd(31, 12, yy) - 2415021) / 29.530588853);
    let nm = newMoon(k, tz);
    if (sunLong(nm, tz) >= 9) nm = newMoon(k - 1, tz);
    return nm;
  }
  function leapOffset(a11, tz) {
    const k = F((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = sunLong(newMoon(k + i, tz), tz);
    do { last = arc; i++; arc = sunLong(newMoon(k + i, tz), tz); } while (arc !== last && i < 14);
    return i - 1;
  }
  function toLunar(dd, mm, yy, tz = 7) {
    const day = jd(dd, mm, yy);
    const k = F((day - 2415021.076998695) / 29.530588853);
    let start = newMoon(k + 1, tz); if (start > day) start = newMoon(k, tz);
    let a11 = month11(yy, tz), b11 = a11, year;
    if (a11 >= start) { year = yy; a11 = month11(yy - 1, tz); } else { year = yy + 1; b11 = month11(yy + 1, tz); }
    const diff = F((start - a11) / 29);
    let leap = 0, month = diff + 11;
    if (b11 - a11 > 365) { const lo = leapOffset(a11, tz); if (diff >= lo) { month = diff + 10; if (diff === lo) leap = 1; } }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    return { day: day - start + 1, month, year, leap };
  }

  /* Ngày lễ (âm lịch) → hệ số nhân hạt & công đức */
  const FEASTS = [
    { m: 1, d: 1, name: 'Mùng 1 Tết Nguyên Đán', x: 2 }, { m: 1, d: 2, name: 'Mùng 2 Tết', x: 2 }, { m: 1, d: 3, name: 'Mùng 3 Tết', x: 2 },
    { m: 1, d: 15, name: 'Rằm Thượng Nguyên', x: 2 },
    { m: 2, d: 8, name: 'Ngày Đức Phật xuất gia', x: 1.5 }, { m: 2, d: 15, name: 'Ngày Đức Phật nhập Niết Bàn', x: 1.5 },
    { m: 2, d: 19, name: 'Vía Quán Thế Âm Bồ Tát', x: 1.5 },
    { m: 4, d: 15, name: 'Đại lễ Phật Đản', x: 2 },
    { m: 6, d: 19, name: 'Vía Quán Thế Âm Bồ Tát thành đạo', x: 1.5 },
    { m: 7, d: 15, name: 'Đại lễ Vu Lan Báo Hiếu', x: 2 },
    { m: 9, d: 19, name: 'Vía Quán Thế Âm Bồ Tát xuất gia', x: 1.5 },
    { m: 9, d: 30, name: 'Vía Phật Dược Sư', x: 1.5 },
    { m: 11, d: 17, name: 'Vía Phật A Di Đà', x: 2 },
    { m: 12, d: 8, name: 'Ngày Đức Phật thành đạo', x: 2 }
  ];

  function today(date = new Date()) {
    // luôn tính theo giờ Việt Nam
    const vn = new Date(date.getTime() + (date.getTimezoneOffset() + 420) * 60000);
    const L = toLunar(vn.getDate(), vn.getMonth() + 1, vn.getFullYear());
    const f = L.leap ? null : FEASTS.find(e => e.m === L.month && e.d === L.day);
    let feast = f ? { name: f.name, x: f.x } : null;
    if (!feast && L.day === 15) feast = { name: `Rằm tháng ${L.month}`, x: 1.5 };
    if (!feast && L.day === 1) feast = { name: `Mùng 1 tháng ${L.month}`, x: 1.5 };
    return Object.assign(L, { text: `${L.day}/${L.month}${L.leap ? ' nhuận' : ''} âm lịch`, feast, mult: feast ? feast.x : 1, vuLanMonth: L.month === 7 && !L.leap });
  }

  return { toLunar, today };
})();
