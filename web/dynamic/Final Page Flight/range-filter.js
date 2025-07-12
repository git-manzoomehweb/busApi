// 1. متغیرهای تغییر یافته
let originTerminalNames = []; // جدید: برای ترمینال‌های مبدا
let destinationTerminalNames = []; // جدید: برای ترمینال‌های مقصد

// حذف این متغیر:
// let terminalNames = []; // این متغیر حذف شده

// 2. قسمت‌های تغییر یافته در busManipulation
// جایگزین کردن cms.terminal با دو تا جدید:
else if (args.source.id === "cms.originterminal") {
    // مدیریت فیلتر ترمینال مبدا
    InUpdateFiltering = false;
    InUpdatePaging = true;
    selectedBusId = null;
    
    if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
        console.error("busManipulation: Invalid source rows for cms.originterminal");
        return;
    }
    
    const value = args.source.rows[0].value;
    const index = originTerminalNames.indexOf(value);
    if (index !== -1) {
        originTerminalNames.splice(index, 1);
        toggleFilterCheckbox(".book-originterminal__content", value, false);
    } else {
        originTerminalNames.push(value);
        toggleFilterCheckbox(".book-originterminal__content", value, true);
    }
} 
else if (args.source.id === "cms.destinationterminal") {
    // مدیریت فیلتر ترمینال مقصد
    InUpdateFiltering = false;
    InUpdatePaging = true;
    selectedBusId = null;
    
    if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
        console.error("busManipulation: Invalid source rows for cms.destinationterminal");
        return;
    }
    
    const value = args.source.rows[0].value;
    const index = destinationTerminalNames.indexOf(value);
    if (index !== -1) {
        destinationTerminalNames.splice(index, 1);
        toggleFilterCheckbox(".book-destinationterminal__content", value, false);
    } else {
        destinationTerminalNames.push(value);
        toggleFilterCheckbox(".book-destinationterminal__content", value, true);
    }
}

// 3. تغییر در قسمت cms.price
else if (args.source.id === "cms.price") {
    // مدیریت فیلتر قیمت
    InUpdateFiltering = false;
    InUpdatePaging = true;
    selectedBusId = null;
    
    if (!priceSlider) {
        console.error("busManipulation: Price slider not found");
        return;
    }
    
    const sliderRect = priceSlider.getBoundingClientRect();

    /**
     * به‌روزرسانی موقعیت اسلایدر قیمت در حرکت ماوس
     * @param {MouseEvent} e - رویداد ماوس
     */
    const onMouseMove = (e) => {
        const x = Math.min(Math.max(e.clientX - sliderRect.left, 0), sliderRect.width);
        const percent = (x / sliderRect.width) * 100;
        
        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }
        
        if (args.source.rows[0].value === "min" && percent <= maxPercent) {
            minPercent = percent;
        } else if (args.source.rows[0].value === "max" && percent >= minPercent) {
            maxPercent = percent;
        }
        updatePriceSlider();
    };

    /**
     * حذف شنونده‌های رویداد در بالا آمدن ماوس
     */
    const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        // تنظیم mustUpdate برای به‌روزرسانی فیلتر پس از پایان drag
        mustUpdate = true;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
} 
else if (args.source.id === "cms.price.update") {
    // مدیریت به‌روزرسانی فیلتر قیمت (internal trigger)
    InUpdateFiltering = false;
    InUpdatePaging = true;
    selectedBusId = null;
    mustUpdate = true;
}

// 4. تغییر در فیلترها (قسمت filters در busManipulation)
// تعریف فیلترها برای پیشنهادات اتوبوس
const filters = [
    // فیلتر شرکت حمل‌ونقل
    item => !carrierNames.length || item.busGroup.some(bus => 
        bus.routesInfo && bus.routesInfo.some(route => carrierNames.includes(route.busOperatorCode))
    ),
    
    // فیلتر ترمینال مبدا
    item => !originTerminalNames.length || item.busGroup.some(bus => 
        originTerminalNames.includes(bus.originTerminal)
    ),
    
    // فیلتر ترمینال مقصد
    item => !destinationTerminalNames.length || item.busGroup.some(bus => 
        destinationTerminalNames.includes(bus.destinationTerminal)
    ),
    
    // باقی فیلترها بدون تغییر...
];

// 5. تغییر در قسمت فیلترینگ (InUpdateFiltering بخش)
// جایگزین کردن قسمت فیلتر ترمینال:
// فیلتر ترمینال مبدا
const uniqueOriginTerminals = filteringSource.flatMap(item =>
    (item.busGroup || []).map(bus => ({
        Name: bus.originTerminal || "",
        Code: bus.originTerminal || ""
    }))
).filter(item => item.Name && item.Code);

const originTerminalListResult = uniqueOriginTerminals.filter((item, index, self) => 
    index === self.findIndex(t => t.Name === item.Name)
);

if (args.context && typeof args.context.setAsSource === 'function') {
    args.context.setAsSource("bus.originterminals", originTerminalListResult);
}

// فیلتر ترمینال مقصد
const uniqueDestinationTerminals = filteringSource.flatMap(item =>
    (item.busGroup || []).map(bus => ({
        Name: bus.destinationTerminal || "",
        Code: bus.destinationTerminal || ""
    }))
).filter(item => item.Name && item.Code);

const destinationTerminalListResult = uniqueDestinationTerminals.filter((item, index, self) => 
    index === self.findIndex(t => t.Name === item.Name)
);

if (args.context && typeof args.context.setAsSource === 'function') {
    args.context.setAsSource("bus.destinationterminals", destinationTerminalListResult);
}

// 6. فانکشن updatePriceSlider کامل (تغییر یافته)
/**
 * به‌روزرسانی اسلایدر قیمت
 */
function updatePriceSlider() {
    try {
        // پیاده‌سازی منطق به‌روزرسانی اسلایدر قیمت
        const minPriceCalculated = (maxPrice - minPrice) * (minPercent / 100) + minPrice;
        const maxPriceCalculated = (maxPrice - minPrice) * (maxPercent / 100) + minPrice;
        
        priceRange[0] = minPriceCalculated;
        priceRange[1] = maxPriceCalculated;
        
        // به‌روزرسانی نمایش قیمت‌ها
        if (priceMinValueLabel) {
            priceMinValueLabel.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(minPriceCalculated));
        }
        if (priceMaxValueLabel) {
            priceMaxValueLabel.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(maxPriceCalculated));
        }
        
        // به‌روزرسانی UI اسلایدر
        if (priceThumbMin) {
            priceThumbMin.style.left = `${minPercent}%`;
        }
        if (priceThumbMax) {
            priceThumbMax.style.left = `${maxPercent}%`;
        }
        if (priceTrack) {
            priceTrack.style.left = `${minPercent}%`;
            priceTrack.style.right = `${100 - maxPercent}%`;
        }
        
        // فراخوانی updateFilterDisplay برای موبایل
        if (typeof updateFilterDisplay === 'function') {
            updateFilterDisplay(
                "price",
                "price-range",
                Math.round(minPriceCalculated),
                Math.round(maxPriceCalculated),
                minPrice,
                maxPrice,
                null,
                null
            );
        }
        
        // تنظیم flag برای به‌روزرسانی لیست اتوبوس‌ها
        mustUpdate = true;
        
        // اجرای فیلتر با تأخیر برای جلوگیری از اجرای مکرر
        clearTimeout(window.priceFilterTimeout);
        window.priceFilterTimeout = setTimeout(() => {
            // شبیه‌سازی تغییر در source برای تریگر کردن busManipulation
            if (typeof busManipulation === 'function') {
                busManipulation({
                    source: {
                        id: 'cms.price.update',
                        rows: [{ value: 'range' }]
                    },
                    context: {
                        setAsSource: function() {},
                        tryToGetSource: function() { return null; }
                    }
                });
            }
        }, 300); // 300ms تأخیر برای debounce
        
    } catch (error) {
        console.error("updatePriceSlider: " + error.message);
    }
}