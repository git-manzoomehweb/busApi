// فانکشن برای تولید dropdown روزها
function generateDayDropdown() {
    let html = '<ul class="book-drop__item__content">';
    
    for (let day = 1; day <= 31; day++) {
        const dayFormatted = day.toString().padStart(2, '0');
        html += `
                                                            <li onclick="selectDropItem(this,'book-date__item__content')"
                                                                class="book-li-item book-cursor-pointer book-p-2"
                                                                data-id="${dayFormatted}" data-value="${day}">${day}</li>`;
    }
    
    html += '\n                                                        </ul>';
    return html;
}

// فانکشن برای تولید dropdown سال‌های میلادی
function generateGregorianYearDropdown(startYear, endYear) {
    let html = '<ul class="book-drop__item__content">';
    
    // سال‌ها را از جدید به قدیم مرتب می‌کنیم (نزولی)
    for (let year = endYear; year >= startYear; year--) {
        const persianYear = year - 621; // تبدیل سال میلادی به شمسی تقریبی
        html += `
                                                            <li onclick="selectDropItem(this,'book-date__item__content')"
                                                                class="book-li-item book-cursor-pointer book-p-2"
                                                                data-switch="${year}" data-id="${persianYear}" data-value="${persianYear}">${persianYear}
                                                            </li>`;
    }
    
    html += '\n                                                        </ul>';
    return html;
}

// فانکشن برای تولید dropdown سال‌های شمسی
function generatePersianYearDropdown(startPersianYear, endPersianYear) {
    let html = '<ul class="book-drop__item__content">';
    
    // سال‌ها را از جدید به قدیم مرتب می‌کنیم (نزولی)
    for (let persianYear = endPersianYear; persianYear >= startPersianYear; persianYear--) {
        const gregorianYear = persianYear + 621; // تبدیل سال شمسی به میلادی تقریبی
        html += `
                                                            <li onclick="selectDropItem(this,'book-date__item__content')"
                                                                class="book-li-item book-cursor-pointer book-p-2"
                                                                data-switch="${gregorianYear}" data-id="${persianYear}" data-value="${persianYear}">${persianYear}
                                                            </li>`;
    }
    
    html += '\n                                                        </ul>';
    return html;
}

// فانکشن برای تولید dropdown ماه‌ها (انگلیسی)
function generateEnglishMonthDropdown() {
    const months = [
        { id: '01', persian: 'فروردین', english: 'January' },
        { id: '02', persian: 'اردیبهشت', english: 'February' },
        { id: '03', persian: 'خرداد', english: 'March' },
        { id: '04', persian: 'تیر', english: 'April' },
        { id: '05', persian: 'مرداد', english: 'May' },
        { id: '06', persian: 'شهریور', english: 'June' },
        { id: '07', persian: 'مهر', english: 'July' },
        { id: '08', persian: 'آبان', english: 'August' },
        { id: '09', persian: 'آذر', english: 'September' },
        { id: '10', persian: 'دی', english: 'October' },
        { id: '11', persian: 'بهمن', english: 'November' },
        { id: '12', persian: 'اسفند', english: 'December' }
    ];
    
    let html = '<ul class="book-drop__item__content">';
    
    months.forEach(month => {
        html += `
                                                            <li onclick="selectDropItem(this,'book-date__item__content')"
                                                                class="book-li-item book-cursor-pointer book-p-2"
                                                                data-id="${month.id}" data-switch="${month.persian}" data-value="${month.english}">
                                                                ${month.english}</li>`;
    });
    
    html += '\n                                                        </ul>';
    return html;
}

// فانکشن برای تولید dropdown ماه‌ها (فارسی)
function generatePersianMonthDropdown() {
    const months = [
        { id: '01', persian: 'فروردین', english: 'January' },
        { id: '02', persian: 'اردیبهشت', english: 'February' },
        { id: '03', persian: 'خرداد', english: 'March' },
        { id: '04', persian: 'تیر', english: 'April' },
        { id: '05', persian: 'مرداد', english: 'May' },
        { id: '06', persian: 'شهریور', english: 'June' },
        { id: '07', persian: 'مهر', english: 'July' },
        { id: '08', persian: 'آبان', english: 'August' },
        { id: '09', persian: 'آذر', english: 'September' },
        { id: '10', persian: 'دی', english: 'October' },
        { id: '11', persian: 'بهمن', english: 'November' },
        { id: '12', persian: 'اسفند', english: 'December' }
    ];
    
    let html = '<ul class="book-drop__item__content">';
    
    months.forEach(month => {
        html += `
                                                            <li onclick="selectDropItem(this,'book-date__item__content')"
                                                                class="book-li-item book-cursor-pointer book-p-2"
                                                                data-switch="${month.english}" data-id="${month.id}" data-value="${month.persian}">
                                                                ${month.persian}</li>`;
    });
    
    html += '\n                                                        </ul>';
    return html;
}

// مثال استفاده:
console.log("=== Days Dropdown ===");
console.log(generateDayDropdown());

console.log("\n=== Gregorian Years Dropdown (1990-2025) ===");
console.log(generateGregorianYearDropdown(1990, 2025));

console.log("\n=== Persian Years Dropdown (1369-1404) ===");
console.log(generatePersianYearDropdown(1369, 1404));

console.log("\n=== English Months Dropdown ===");
console.log(generateEnglishMonthDropdown());

console.log("\n=== Persian Months Dropdown ===");
console.log(generatePersianMonthDropdown());