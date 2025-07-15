/**
 * Global state for session management and UI updates.
 */

const isMobile = document.querySelector('main')?.dataset.mob === "true";
const tripNames = ["اول", "دوم", "سوم", "چهارم"];
let providerDataList = [];
let isClosing = false;
let totalTime = 20 * 60; // 20 minutes in seconds
let warningShown = false;
let progressTimer;
let progress = 10;

// Cached DOM elements
const progressBar = document.querySelector(".book-progress__bar");
const modalContainer = document.querySelector(".book-expire__message__modal__container");
const someTime = modalContainer?.querySelector(".book-some__time");
const noTime = modalContainer?.querySelector(".book-no__time");
let inboundMinPercent = 0;
let inboundMaxPercent = 100;
let outboundMinPercent = 0;
let outboundMaxPercent = 100;

let listData;

let sessionSearchStorage = sessionStorage.getItem("sessionSearch") ? JSON.parse(sessionStorage.getItem("sessionSearch")) : {};

console.log(sessionSearchStorage);
console.log(typeof sessionSearchStorage);
let schemaId = 0;
const cookieValue = `; ${document.cookie}`;
const cookieParts = cookieValue.split(`; rkey=`); // Split cookie to extract 'rkey'

const setSession = async (args) => {
    console.log("args:", args);
    if (!sessionSearchStorage) return;

    // Update session data
    schemaId = sessionSearchStorage.Schemaid;
    sessionSearchStorage.SessionId = args.source._rows[0].sessionId;
    sessionSearchStorage.rkey = cookieParts[1];
    sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));

    let cleanTripGroup = [];

    if (Array.isArray(sessionSearchStorage.tripGroup)) {
        cleanTripGroup = sessionSearchStorage.tripGroup.map(item => {
            const { destinationName, originName, ...rest } = item;
            return rest;
        });
    }

    // استفاده صحیح از $bc.setSource
    if (typeof $bc !== 'undefined' && $bc.setSource) {
        $bc.setSource("cms.rule", {
            type: "upselling",
            TripGroup: JSON.stringify(cleanTripGroup),
            dmnid: sessionSearchStorage.dmnid || 0,
            Type: sessionSearchStorage.Type || "",
            lid: sessionSearchStorage.lid || 1,
            SessionId: sessionSearchStorage.SessionId || "",
            run: true
        });
    }

    // Set session expiry (20 minutes)
    const now = new Date();
    const ttl = 20 * 60 * 1000; // 20 minutes in milliseconds
    sessionSearchStorage = { ...sessionSearchStorage, Expiry: now.getTime() + ttl };

    // Fetch provider data for client users
    if (cookieParts.length === 2) {
        try {
            const userResponse = await fetch('/Client_User_Type.inc');
            const user = await userResponse.text();
            if (user === "1") {
                const providerResponse = await fetch('/Client_Provider_Library.bc');
                providerDataList = await providerResponse.json();
            }
        } catch (error) {
            console.error("setSession: Failed to fetch provider data - " + error.message);
        }
    }
};

/**
 * Generates a 30-day calendar with Gregorian and Persian (Shamsi) dates
 * @param {Object} args - Arguments containing source data and context
 * @returns {void}
 */
const setCalendarLookUp = async (args) => {
    try {
        const result = [];
        const today = new Date();
        
        // بررسی وجود args.source و args.source.rows
        if (!args.source || !args.source.rows || !Array.isArray(args.source.rows)) {
            console.error("setCalendarLookUp: Invalid source data structure");
            return;
        }
        
        const prices = args.source.rows.slice(0, 30).map(row => row.min_price);

        // This code is for the mobile version
        const unitFull = document.querySelectorAll(".book-currency")[0]?.textContent?.trim();
        const unit = unitFull ? unitFull.charAt(0) : "";
        const now = new Date();

        const month = new Intl.DateTimeFormat("fa-IR", {
            calendar: "persian",
            month: "long"
        }).format(now);

        const year = new Intl.DateTimeFormat("fa-IR", {
            calendar: "persian",
            year: "numeric"
        }).format(now);

        const todayDateElement = document.querySelector(".book_today__date");
        if (todayDateElement) {
            todayDateElement.textContent = `${month} ${year}`;
        }

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            // Format Gregorian date (YYYY-MM-DD)
            const gregorian = date.toISOString().split("T")[0];

            // Format Shamsi full date (DD/MM/YYYY)
            const shamsi = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(date).replace(/‏/g, "");

            // Extract weekday in Persian (e.g. "Saturday")
            // This code is for the mobile version
            const weekdayFull = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                weekday: "long"
            }).format(date);
            const weekday = weekdayFull.charAt(0);

            // Extract month name in Persian (e.g. "Ordibehesht")
            const monthName = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                month: "long"
            }).format(date);

            // Extract month number in Persian (e.g. "02")
            const monthNumber = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                month: "2-digit"
            }).format(date);

            // Extract day of the month (e.g. "02")
            const day = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                day: "2-digit"
            }).format(date);

            const price = prices[i] ?? null;

            result.push({
                gregorian,
                shamsi,
                weekday,
                monthName,
                monthNumber,
                day,
                price,
                unit
            });
        }
        
        // استفاده صحیح از args.context.setAsSource
        if (args.context && typeof args.context.setAsSource === 'function') {
            args.context.setAsSource("bus.calendar", result);
        } else {
            console.error("setCalendarLookUp: context.setAsSource is not available");
        }
    } catch (error) {
        console.error("setCalendarLookUp: " + error.message);
    }
};

/**
 * Constructs the request body for API calls using bus search data
 * @param {Object} context - The context object
 * @param {string} sourceId - The source ID
 * @param {Object} params - Additional parameters
 * @returns {Object} The constructed request body
 */
const bodyMakerFunction = (context, sourceId, params) => {
    try {
        const sessionSearchData = JSON.parse(sessionStorage.getItem("sessionSearch")) || {};
        const cleanedData = { ...sessionSearchData };

        // Remove unnecessary fields
        delete cleanedData.Schemaid;
        delete cleanedData.Type;
        delete cleanedData.Expiry;
        
        if (cleanedData.TripGroup && Array.isArray(cleanedData.TripGroup)) {
            cleanedData.TripGroup.forEach(trip => {
                delete trip.OriginName;
                delete trip.DestinationName;
            });
        }

        // Add domain ID and merge with params
        const mainElement = document.querySelector("main");
        if (mainElement) {
            cleanedData.dmnid = mainElement.getAttribute("data-dmnid");
        }
        
        return Object.assign({}, params, cleanedData);
    } catch (error) {
        console.error("bodyMakerFunction: " + error.message);
        return params || {};
    }
};

/**
 * Handles connection closure, updating UI based on success or failure
 * @param {Object} param - Parameters containing context and error status
 * @returns {void}
 */
const onCloseConnection = (param) => {
    try {
        if (!param || !param.context) return;

        if (!param.withError) {
            isClosing = true;
            executeTimer();
            
            const renderedContainers = document.querySelectorAll(".book-rendered__container");
            renderedContainers.forEach(e => e.classList.remove("book-hidden"));
            
            const renderingContainer = document.querySelector(".book-rendering__container");
            if (renderingContainer) {
                renderingContainer.remove();
            }
            
            completeProgressBar();
            setupBookCardButtons();

            // Trigger calendar lookup if enabled
            const mainElement = document.querySelector("main");
            if (mainElement && mainElement.getAttribute("data-calendarLookUp") === 'true') {
                if (sessionSearchStorage && sessionSearchStorage.TripGroup && sessionSearchStorage.TripGroup[0]) {
                    const { Origin, Destination } = sessionSearchStorage.TripGroup[0];
                    
                    if (typeof $bc !== 'undefined' && $bc.setSource) {
                        $bc.setSource("cms.calendarLookUp", { 
                            origin: Origin, 
                            destination: Destination, 
                            run: true 
                        });
                    }
                }
                
                const priceSelectionContainer = document.querySelector(".book-card__price__selection__container");
                if (priceSelectionContainer) {
                    priceSelectionContainer.classList.remove('book-hidden');
                }
            }
        } else {
            const mainContainer = document.querySelector(".book-main__container");
            const noDataContainer = document.querySelector(".book-nodata__container");
            
            if (mainContainer) {
                mainContainer.classList.add("book-hidden");
            }
            if (noDataContainer) {
                noDataContainer.classList.remove("book-hidden");
            }
        }
    } catch (error) {
        console.error("onCloseConnection: " + error.message);
    }
};

/**
 * Sets up event listeners for book card buttons
 * @returns {void}
 */
const setupBookCardButtons = () => {
    try {
        const cardButtons = document.querySelectorAll(".book-card__btn");
        cardButtons.forEach(btn => {
            btn.classList.remove("book-card__btn__not__active");
            btn.onclick = function () {
                const busId = this.getAttribute("data-id");
                if (busId && typeof selectModalContainer === 'function') {
                    selectModalContainer(this, busId);
                }
            };
        });
    } catch (error) {
        console.error("setupBookCardButtons: " + error.message);
    }
};

/**
 * Runs a timer for session expiry, showing warnings at 6 minutes and on expiry
 * @returns {void}
 */
const executeTimer = () => {
    try {
        if (totalTime <= 0) {
            if (modalContainer) {
                modalContainer.classList.remove("book-hidden");
            }
            if (someTime) {
                someTime.classList.add("book-hidden");
            }
            if (noTime) {
                noTime.classList.remove("book-hidden");
            }
            return;
        }

        totalTime--;

        if (totalTime === 360 && !warningShown) {
            warningShown = true;
            if (modalContainer) {
                modalContainer.classList.remove("book-hidden");
            }
            if (someTime) {
                someTime.classList.remove("book-hidden");
            }
        }

        setTimeout(executeTimer, 1000);
    } catch (error) {
        console.error("executeTimer: " + error.message);
    }
};

/**
 * Starts the progress bar animation, incrementing up to 95%
 * @param {number} [interval=500] - The interval in milliseconds
 * @returns {void}
 */
const startProgressBar = (interval = 500) => {
    try {
        if (progressTimer) {
            clearInterval(progressTimer);
        }
        progressTimer = setInterval(() => {
            if (isClosing) return;
            progress = Math.min(progress + 1, 95);
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }, interval);
    } catch (error) {
        console.error("startProgressBar: " + error.message);
    }
};

/**
 * Completes the progress bar animation, reaching 100%
 * @returns {void}
 */
const completeProgressBar = () => {
    try {
        if (progressTimer) {
            clearInterval(progressTimer);
        }
        const finalInterval = setInterval(() => {
            progress = Math.min(progress + 10, 100);
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            if (progress >= 100) {
                clearInterval(finalInterval);
            }
        }, 20);
    } catch (error) {
        console.error("completeProgressBar: " + error.message);
    }
};

/**
 * Global state for bus filtering, sorting, and pagination
 */
let carrierNames = []; // اصلاح شده: این متغیر در کد اصلی تعریف نشده بود
let originTerminalNames = []; // جدید: برای ترمینال‌های مبدا
let destinationTerminalNames = []; // جدید: برای ترمینال‌های مقصد
let stopNames = [];
let busTypeNames = [];
let departureTimeNames = [];
let durationRange = [0, Infinity];
let maxDuration = 0;
let minDuration = 0;
let durationMinValueLabel = document.querySelector(".book-duration__content .book-min__value");
let durationMaxValueLabel = document.querySelector(".book-duration__content .book-max__value");

// متغیرهای دیگر که در کد اصلی وجود داشتند
let outboundAirlineList = [];
let inboundAirlineList = [];
let airlineList = [];
let outboundAirportList = [];
let inboundAirportList = [];
let airportList = [];
let outboundStopList = [];
let inboundStopList = [];
let outboundBaggageList = [];
let inboundBaggageList = [];
let baggageList = [];
let outboundAirlineNames = [];
let inboundAirlineNames = [];
let airlineNames = [];
let outboundAirportNames = [];
let inboundAirportNames = [];
let airportNames = [];
let outboundStopNames = [];
let inboundStopNames = [];
let outboundBaggageNames = [];
let inboundBaggageNames = [];
let baggageNames = [];
let outboundbusNumberNames = [];
let inboundbusNumberNames = [];
let busNumberNames = [];
let outboundDepartureTimeNames = [];
let inboundDepartureTimeNames = [];
let currency = "";

// Cached DOM elements for hour range sliders
const outboundHourMinValueLabel = document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-min__value");
const outboundHourMaxValueLabel = document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-max__value");
let outboundMinHour = 0;
let outboundMaxHour = 0;
let outboundHourRange = [0, Infinity];

const inboundHourMinValueLabel = document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-min__value");
const inboundHourMaxValueLabel = document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-max__value");
let inboundMinHour = 0;
let inboundMaxHour = 0;
let inboundHourRange = [0, Infinity];

const hourMinValueLabel = document.querySelector(".book-hour__content .book-filter__hour__container .book-min__value");
const hourMaxValueLabel = document.querySelector(".book-hour__content .book-filter__hour__container .book-max__value");
let minHour = 0;
let maxHour = 0;
let hourRange = [0, Infinity];

// Additional filter and UI state
let systembusNames = [];
let fareFamilyNames = [];
let selectedBusId = null; // اصلاح شده: selectedbusId به selectedBusId تغییر یافت
let dictionaries = [];
let BusProposalsSource = []; // اصلاح شده: busProposalsSource به BusProposalsSource تغییر یافت برای consistency
let mustUpdate = true;
let newDataCame = false;
let InUpdateUIProcess = false;
let InUpdatePaging = true;
let InUpdateFiltering = true;
let allDataProcessed = false;

// Cached DOM elements for price slider
const priceSlider = document.querySelector(".book-filter__price__container .book-slider__content");
const priceTrack = document.querySelector(".book-filter__price__container .book-slider__track");
const priceThumbMin = document.querySelector(".book-filter__price__container .book-thumb__min");
const priceThumbMax = document.querySelector(".book-filter__price__container .book-thumb__max");
let priceMinValueLabel = document.querySelector(".book-filter__price__container .book-min__value");
let priceMaxValueLabel = document.querySelector(".book-filter__price__container .book-max__value");
let minPrice = 0;
let maxPrice = 0;
let priceRange = [0, Infinity];
let minPercent = 0;
let maxPercent = 100;
let currentSort = { value: "default", order: "" };
let elseExecuted = false;
let allBusProposals = [];
let originalBusProposals = [];
const filterContent = document.querySelector(".book-aside__filter__content");

startProgressBar(1000);

// تابع اصلی busManipulation برای اتوبوس - بدون نیاز به formatBusData جداگانه
const busManipulation = async (args) => {
    try {
        // بررسی وجود args و args.source
        if (!args || !args.source) {
            console.error("busManipulation: Invalid arguments structure");
            return;
        }

        // مقداردهی اولیه متغیرهای صفحه‌بندی و به‌روزرسانی UI
        let currentIndex = 0;
        let start = 0;
        let end = 2;
        let dynamicBusProposalsCount = 0;
        elseExecuted = false;
        startProgressBar();

        /**
         * مدیریت صفحه‌بندی، فیلترگذاری و مرتب‌سازی بر اساس شناسه منبع
         */
        if (args.source.id === 'cms.page') {
            // مقداردهی اولیه وضعیت صفحه‌بندی
            mustUpdate = true;
            InUpdatePaging = false;
            InUpdateFiltering = false;
            selectedBusId = null;

            // بررسی وجود args.source.rows
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.page");
                return;
            }

            const currentValue = parseInt(args.source.rows[0].value);
            const prevButton = document.querySelector(".book-prevpage");
            const nextButton = document.querySelector(".book-nextpage");
            const pagingContainer = document.querySelector(".book-paging__cards__container");

            if (!pagingContainer) {
                console.error("busManipulation: Paging container not found");
                return;
            }

            // به‌روزرسانی استایل صفحه فعال
            const activeButton = document.querySelector(".book-active__paging");
            if (activeButton) {
                activeButton.classList.remove("book-active__paging");
                activeButton.classList.add("bg-white");
            }
            
            const newActive = pagingContainer.querySelector(`[bc-value="${currentValue}"]`);
            if (newActive) {
                newActive.classList.add("book-active__paging");
                newActive.classList.remove("bg-white");
            }

            // محاسبه محدوده صفحه‌بندی
            start = currentValue * 30;
            end = start + 30;

            // تغییر وضعیت نمایش دکمه قبلی
            if (prevButton) {
                prevButton.classList.toggle("book-hidden", currentValue === 0);
            }

            // تغییر وضعیت نمایش دکمه بعدی
            const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
            const lastButton = allButtons[allButtons.length - 1];
            if (nextButton) {
                nextButton.classList.toggle("book-hidden", newActive === lastButton);
            }
        } 
        else if (args.source.id === 'cms.nextpage') {
            // مدیریت ناوبری صفحه بعدی
            mustUpdate = true;
            InUpdatePaging = false;
            InUpdateFiltering = false;
            selectedBusId = null;

            const prevButton = document.querySelector(".book-prevpage");
            const nextButton = document.querySelector(".book-nextpage");
            const activeButton = document.querySelector(".book-active__paging");
            
            if (!activeButton) {
                console.error("busManipulation: Active paging button not found");
                return;
            }
            
            const currentValue = parseInt(activeButton.getAttribute("bc-value"));
            const nextValue = currentValue + 1;
            const nextPage = document.querySelector(`.book-paging__cards__container [bc-value="${nextValue}"]`);

            if (nextPage) {
                // به‌روزرسانی استایل صفحه فعال
                activeButton.classList.remove("book-active__paging");
                activeButton.classList.add("bg-white");
                nextPage.classList.add("book-active__paging");
                nextPage.classList.remove("bg-white");

                // نمایش صفحه بعدی در صورت مخفی بودن
                if (nextPage.classList.contains("book-hidden")) {
                    nextPage.classList.remove("book-hidden");
                    const firstVisible = document.querySelector(".book-paging__container:not(.hidden):not(.book-prevpage):not(.book-nextpage)");
                    if (firstVisible) firstVisible.classList.add("book-hidden");
                }

                // نمایش دکمه قبلی در صورت عدم قرارگیری در صفحه اول
                if (prevButton) {
                    prevButton.classList.toggle("book-hidden", nextValue === 0);
                }
            }

            // تغییر وضعیت نمایش دکمه بعدی
            const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
            const lastButton = allButtons[allButtons.length - 1];
            if (nextButton) {
                nextButton.classList.toggle("book-hidden", nextPage === lastButton);
            }

            // به‌روزرسانی محدوده صفحه‌بندی
            start = nextValue * 30;
            end = start + 30;
        } 
        else if (args.source.id === 'cms.prevpage') {
            // مدیریت ناوبری صفحه قبلی
            mustUpdate = true;
            InUpdatePaging = false;
            InUpdateFiltering = false;
            selectedBusId = null;

            const prevButton = document.querySelector(".book-prevpage");
            const nextButton = document.querySelector(".book-nextpage");
            const activeButton = document.querySelector(".book-active__paging");
            
            if (!activeButton) {
                console.error("busManipulation: Active paging button not found");
                return;
            }
            
            const currentValue = parseInt(activeButton.getAttribute("bc-value"));
            const prevValue = currentValue - 1;
            const prevPage = document.querySelector(`.book-paging__cards__container [bc-value="${prevValue}"]`);

            if (prevPage) {
                // به‌روزرسانی استایل صفحه فعال
                activeButton.classList.remove("book-active__paging");
                activeButton.classList.add("bg-white");
                prevPage.classList.add("book-active__paging");
                prevPage.classList.remove("bg-white");

                // نمایش صفحه قبلی در صورت مخفی بودن
                if (prevPage.classList.contains("book-hidden")) {
                    prevPage.classList.remove("book-hidden");
                    const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
                    const lastVisible = allButtons.reverse().find(btn => !btn.classList.contains("book-hidden"));
                    if (lastVisible) lastVisible.classList.add("book-hidden");
                }

                // تغییر وضعیت نمایش دکمه‌های قبلی و بعدی
                if (prevButton) {
                    prevButton.classList.toggle("book-hidden", prevValue === 0);
                }
                if (nextButton) {
                    nextButton.classList.remove("book-hidden");
                }
            }

            // به‌روزرسانی محدوده صفحه‌بندی
            start = prevValue * 30;
            end = start + 30;
        } 
        else if (args.source.id === "cms.carrier") {
            // مدیریت فیلتر شرکت حمل‌ونقل
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.carrier");
                return;
            }
            
            const value = args.source.rows[0].value;
            const index = carrierNames.indexOf(value);
            if (index !== -1) {
                carrierNames.splice(index, 1);
                toggleFilterCheckbox(".book-carrier__content", value, false);
            } else {
                carrierNames.push(value);
                toggleFilterCheckbox(".book-carrier__content", value, true);
            }
        } 
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
        else if (args.source.id === "cms.stops") {
            // مدیریت فیلتر تعداد توقف‌ها
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.stops");
                return;
            }
            
            const stopValue = parseInt(args.source.rows[0].value);
            const index = stopNames.indexOf(stopValue);

            if (index !== -1) {
                stopNames.splice(index, 1);
                toggleFilterCheckbox(".book-stops__content", args.source.rows[0].value, false, "");
            } else {
                stopNames.push(stopValue);
                toggleFilterCheckbox(".book-stops__content", args.source.rows[0].value, true, "");
            }
        } 
        else if (args.source.id === "cms.bustype") {
            // مدیریت فیلتر نوع اتوبوس
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.bustype");
                return;
            }
            
            const busTypeValue = args.source.rows[0].value.trim();
            if (busTypeValue === "") {
                busTypeNames = [];
                if (isMobile) {
                    removeFilterDiv("bus-type");
                }
            } else {
                busTypeNames = busTypeValue
                    .split(",")
                    .map(item => item.trim().toLowerCase())
                    .filter(item => item !== "");
                // این کد برای نسخه موبایل است
                if (isMobile) {
                    removeFilterDiv("bus-type");
                    addFilterDiv("bus-type", "cms.bustype", busTypeValue);
                }
            }
        } 
        else if (args.source.id === "cms.departuretime") {
            // مدیریت فیلتر زمان حرکت
            InUpdateFiltering = false;
            InUpdatePaging = true;
            const content = document.querySelector(".book-departuretime__content");
            if (!content) return;

            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.departuretime");
                return;
            }

            const value = args.source.rows[0].value;
            const selectedEl = content.querySelector(`[bc-value="${value}"]`);
            if (!selectedEl) return;

            const timePeriod = selectedEl.dataset.timePeriod || "";
            const timeRange = selectedEl.dataset.timeRange || "";
            const flexContainer = content.querySelector(".book-times__content");

            const index = departureTimeNames.indexOf(value);
            if (index !== -1) {
                departureTimeNames.splice(index, 1);
                toggleFilterCheckbox(".book-departuretime__content", value, false, "");
                const existingElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                if (existingElement) existingElement.remove();
                
                // بازگردانی محتوای زمان پیش‌فرض در صورت عدم وجود
                if (!content.querySelector(".book-time__content")) {
                    const defaultTimeContent = document.createElement("div");
                    defaultTimeContent.className = "book-time__content";
                    defaultTimeContent.setAttribute("data-value", "time");
                    defaultTimeContent.innerHTML = `
                        <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">صبح</div>
                        <div class="book-text-zinc-900 book-text-xs book-mb-4">
                            ساعت از: <span class="book-hour">5:00 تا 11:59</span>
                        </div>
                    `;
                    content.insertBefore(defaultTimeContent, flexContainer);
                }
            } else {
                departureTimeNames.push(value);
                toggleFilterCheckbox(".book-departuretime__content", value, true, "");
                const existingTimeContents = content.querySelectorAll(".book-time__content");
                
                if (existingTimeContents.length === 1 && departureTimeNames.length === 1) {
                    const defaultTimeContent = existingTimeContents[0];
                    defaultTimeContent.setAttribute("data-value", value);
                    defaultTimeContent.innerHTML = `
                        <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                        <div class="book-text-zinc-900 book-text-xs book-mb-4">
                            ساعت از: <span class="book-hour">${timeRange}</span>
                        </div>
                    `;
                } else {
                    const duplicateElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                    if (duplicateElement) duplicateElement.remove();

                    const newTimeContent = document.createElement("div");
                    newTimeContent.className = "book-time__content";
                    newTimeContent.setAttribute("data-value", value);
                    newTimeContent.innerHTML = `
                        <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                        <div class="book-text-zinc-900 book-text-xs book-mb-4">
                            ساعت از: <span class="book-hour">${timeRange}</span>
                        </div>
                    `;
                    content.insertBefore(newTimeContent, flexContainer);
                }
            }
        } 
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
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        } 
        else if (args.source.id === "cms.duration") {
            // مدیریت فیلتر مدت زمان سفر
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            const durationContainer = document.querySelector(".book-duration__content .book-filter__duration__container");
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.duration");
                return;
            }
            
            initializeSlider(
                durationContainer,
                args.source.rows[0].value,
                maxDuration,
                minDuration,
                durationMinValueLabel,
                durationMaxValueLabel,
                durationRange,
                'duration',
                'duration-range'
            );
        } 
        else if (args.source.id === "cms.sort") {
            // مدیریت فیلتر مرتب‌سازی
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.sort");
                return;
            }
            
            const sortValue = args.source.rows[0].value;
            const sortItem = document.querySelector(`[bc-value="${sortValue}"]`);
            
            if (!sortItem) {
                console.error("busManipulation: Sort item not found");
                return;
            }
            
            const sortOrder = sortItem.getAttribute('data-sort');
            const listItems = document.querySelectorAll(".book-sort__cards__container .book-sort__item__content");

            listItems.forEach(item => {
                if (item.getAttribute('data-sort')) {
                    item.setAttribute('data-sort', 'descend');
                }
                const svg = item.querySelector('svg');
                if (svg) {
                    svg.innerHTML = '<use xlink:href="/booking/images/sprite-booking-icons.svg#sort-up-icon"></use>';
                }
                item.classList.remove('book-sorting__active');
            });

            if (sortValue === "default") {
                currentSort = { value: "default", order: "" };
            } else {
                const newOrder = sortOrder === "ascend" ? "descend" : "ascend";
                sortItem.setAttribute('data-sort', newOrder);
                sortItem.classList.add('book-sorting__active');
                toggleSvg(sortItem.querySelector('svg'), newOrder === "ascend");
                currentSort = { value: sortValue, order: newOrder };
            }
            mustUpdate = true;
        } 
        else if (args.source.id === "cms.bus") {
            // مدیریت انتخاب اتوبوس
            InUpdateFiltering = false;
            InUpdatePaging = true;
            
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.bus");
                return;
            }
            
            selectedBusId = args.source.rows[0].value;
        } 
        else if (args.source.id === "bus.search") {
            // مدیریت داده‌های جدید اتوبوس
            newDataCame = true;
            allDataProcessed = false;
        }

        /**
         * به‌روزرسانی UI با پیشنهادات اتوبوس فیلتر شده و مرتب شده
         */
        if (mustUpdate && !InUpdateUIProcess) {
            InUpdateUIProcess = true;

            // جمع‌آوری پیشنهادات جدید اتوبوس و بازنشانی برای جستجوهای جدید
            if (newDataCame) {
                let source;
                if (args.context && typeof args.context.tryToGetSource === 'function') {
                    source = args.context.tryToGetSource("bus.search");
                } else {
                    console.error("busManipulation: context.tryToGetSource is not available");
                    InUpdateUIProcess = false;
                    return;
                }
                
                if (!source || !source.rows || !Array.isArray(source.rows)) {
                    console.error("busManipulation: Invalid bus.search source");
                    InUpdateUIProcess = false;
                    return;
                }
                
                // بازنشانی داده‌ها برای جستجوهای جدید
                if (source.rows[0]?.isNewSearch) {
                    allBusProposals = [];
                    dictionaries = [];
                }
                
                const existingBusIds = new Set(allBusProposals.map(bus => bus.busId));
                source.rows.forEach(row => {
                    if (Array.isArray(row.busProposals)) {
                        const newBuses = row.busProposals.filter(bus => !existingBusIds.has(bus.busId));
                        allBusProposals.push(...newBuses);
                        originalBusProposals = [...allBusProposals];
                        newBuses.forEach(bus => existingBusIds.add(bus.busId));
                    }
                });
                
                if (source.rows[source.rows.length - 1]?.dictionaries) {
                    dictionaries.push(source.rows[source.rows.length - 1].dictionaries);
                }
                newDataCame = false;
                allDataProcessed = true;
            }

            // اعمال مرتب‌سازی در صورت عدم پیش‌فرض بودن و پردازش شدن تمام داده‌ها
            if (allDataProcessed) {
                if (currentSort.value === "default") {
                    allBusProposals = [...originalBusProposals];  // برگرد به ترتیب اصلی
                } else {
                    allBusProposals.sort((a, b) => {
                        let fieldA, fieldB;
                        if (currentSort.value === "price") {
                            fieldA = a.priceInfo?.totalCommission ? parseFloat(a.priceInfo.totalCommission) : Infinity;
                            fieldB = b.priceInfo?.totalCommission ? parseFloat(b.priceInfo.totalCommission) : Infinity;
                        } else if (currentSort.value === "stops") {
                            fieldA = a.busGroup?.[0]?.numberOfStops || 0;
                            fieldB = b.busGroup?.[0]?.numberOfStops || 0;
                        } else if (currentSort.value === "duration") {
                            fieldA = convertToMinutes(a.busGroup?.[0]?.duration || "");
                            fieldB = convertToMinutes(b.busGroup?.[0]?.duration || "");
                        } else if (currentSort.value === "departure") {
                            fieldA = convertToMinutes(a.busGroup?.[0]?.departureTime || "");
                            fieldB = convertToMinutes(b.busGroup?.[0]?.departureTime || "");
                        }
                        
                        if (fieldA !== undefined && fieldB !== undefined) {
                            return currentSort.order === "ascend" ? fieldA - fieldB : fieldB - fieldA;
                        }
                        return 0;
                    });
                }
            }

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
                
                // فیلتر تعداد توقف‌ها
                item => !stopNames.length || item.busGroup.some(bus => 
                    stopNames.includes(parseInt(bus.numberOfStops))
                ),
                
                // فیلتر نوع اتوبوس
                item => !busTypeNames.length || busTypeNames.every(bt => 
                    item.busGroup.some(bus => 
                        bus.routesInfo && bus.routesInfo.some(route => 
                            route.busType?.toLowerCase().includes(bt)
                        )
                    )
                ),
                
                // فیلتر زمان حرکت
                item => {
                    if (!departureTimeNames.length) return true;
                    return item.busGroup.some(bus => {
                        const [hour, minute] = bus.departureTime?.split(":")?.map(Number) || [];
                        if (hour == null || minute == null) return false;
                        return departureTimeNames.some(range => {
                            const [start, end] = range.split("-").map(Number);
                            return hour >= start && hour <= end;
                        });
                    });
                },
                
                // فیلتر محدوده مدت زمان (در صورت وجود duration)
                item => {
                    return item.busGroup.some(bus => {
                        const duration = bus.duration;
                        if (!duration) return true; // رد کردن فیلتر در صورت عدم وجود مدت زمان
                        const durationInMinutes = convertToMinutes(duration);
                        return durationInMinutes >= durationRange[0] && durationInMinutes <= durationRange[1];
                    });
                },
                
                // فیلتر قیمت
                item => {
                    const price = item.priceInfo?.totalCommission ? parseFloat(item.priceInfo.totalCommission) : Infinity;
                    return price >= priceRange[0] && price <= priceRange[1];
                }
            ];

            // فیلتر کردن پیشنهادات اتوبوس
            const newSource = allBusProposals.filter(item => filters.every(filter => filter(item)));

            // به‌روزرسانی نمایش تعداد اتوبوس
            dynamicBusProposalsCount = newSource.length;
            const countElement = document.querySelector(".book-count__api__content");
            if (countElement) {
                countElement.textContent = dynamicBusProposalsCount;
            }

            // افزودن شاخص و وضعیت انتخاب و فرمت‌دهی داده‌ها
            const locationDict = dictionaries[0]?.location || {};
            const carrierDict = dictionaries[0]?.carriers || {};
            const currencyDict = dictionaries[0]?.currency || {};

            const indexedSource = newSource.map((item, i) => {
                const busGroup = item.busGroup?.[0] || {};
                const routeInfo = busGroup.routesInfo?.[0] || {};
                
                // اصلاح استخراج قیمت - استفاده از totalCommission به جای total
                const price = parseFloat(item.priceInfo?.totalCommission) || parseFloat(item.priceInfo?.total) || 0;
                const totalCommission = parseFloat(item.priceInfo?.totalCommission) || 0;
                const currencyCode = item.priceInfo?.currency || 'IRR';
                const originId = busGroup.origin;
                const destinationId = busGroup.destination;
                const carrierCode = routeInfo.busOperatorCode;

                // دیباگ اطلاعات قیمت
                console.log(`Debug price for bus ${item.busId}:`, {
                    priceInfo: item.priceInfo,
                    price: price,
                    totalCommission: totalCommission,
                    currencyCode: currencyCode,
                    currency: currencyDict[currencyCode],
                    currencyDict: currencyDict
                });

                return {
                    // داده‌های اصلی
                    ...item,
                    SelectedBus: item.busId === selectedBusId,
                    index: currentIndex + i,
                    
                    // داده‌های فرمت شده برای نمایش
                    rowNumber: i + 1,
                    
                    // اطلاعات مبدا
                    origin: originId,
                    originTerminal: busGroup.originTerminal || '',
                    originCity: locationDict[originId]?.city || '',
                    originCountry: locationDict[originId]?.country || '',
                    
                    // اطلاعات مقصد
                    destination: destinationId,
                    destinationTerminal: busGroup.destinationTerminal || '',
                    destinationCity: locationDict[destinationId]?.city || '',
                    destinationCountry: locationDict[destinationId]?.country || '',
                    
                    // اطلاعات زمانی
                    departureDate: busGroup.departureDate || '',
                    departureTime: busGroup.departureTime || '',
                    arrivalDate: busGroup.arrivalDate || '',
                    arrivalTime: busGroup.arrivalTime || '',
                    duration: busGroup.duration || '',
                    
                    // اطلاعات اتوبوس
                    busType: routeInfo.busType || '',
                    numberOfStops: busGroup.numberOfStops || 0,
                    availableSeats: busGroup.availableSeats || 0,
                    
                    // اطلاعات بازپرداخت
                    refundable: busGroup.refundable || false,
                    refundableText: busGroup.refundable ? 'بله' : 'خیر',
                    
                    // اطلاعات قیمت - اصلاح شده
                    baseFare: parseFloat(item.priceInfo?.baseFare) || 0,
                    tax: parseFloat(item.priceInfo?.tax) || 0,
                    providerFare: parseFloat(item.priceInfo?.providerFare) || 0,
                    price: price,
                    totalCommission: totalCommission,
                    formattedPrice: formatPrice(price, currencyDict[currencyCode] || 'ریال'),
                    formattedTotalCommission: formatPrice(totalCommission, currencyDict[currencyCode] || 'ریال'),
                    currency: currencyDict[currencyCode] || 'ریال',
                    currencyCode: currencyCode,
                    
                    // اطلاعات شرکت حمل‌ونقل
                    carrierCode: carrierCode,
                    carrierName: carrierDict[carrierCode]?.name || '',
                    carrierImage: carrierDict[carrierCode]?.image || '',
                    
                    // اطلاعات ارائه‌دهنده
                    providerId: item.Provider?.ProviderId || '',
                    dmnid: item.Provider?.Dmnid || '',
                    
                    // اطلاعات توضیحات
                    description: busGroup.description || '',
                    
                    // اطلاعات مسیر
                    segmentId: routeInfo.SegmentId || 1,
                    originRoute: routeInfo.originRoute || originId,
                    destinationRoute: routeInfo.destinationRoute || destinationId,
                };
            });
            
            currentIndex += newSource.length;

            // مدیریت اسکرول اتوبوس انتخاب شده
            const selectedIndex = indexedSource.findIndex(item => item.SelectedBus);
            if (selectedIndex !== -1) {
                const page = Math.floor(selectedIndex / 30);
                start = page * 30;
                end = start + 30;
                setTimeout(() => {
                    const targetElement = document.getElementById(`bus__${selectedIndex}`);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 100);
            }

            // اعمال صفحه‌بندی
            const pagedSource = indexedSource.slice(start, end);
            BusProposalsSource = pagedSource;

            if (pagedSource.length > 0) {
                // به‌روزرسانی محدوده قیمت با قیمت‌های تجزیه شده
                const pricesSource = allBusProposals.map(item => 
                    item.priceInfo?.totalCommission ? parseFloat(item.priceInfo.totalCommission) : null
                ).filter(Boolean);
                
                minPrice = pricesSource.length ? Math.min(...pricesSource) : 0;
                maxPrice = pricesSource.length ? Math.max(...pricesSource) : 0;
                
                if (priceMaxValueLabel) {
                    priceMaxValueLabel.textContent = new Intl.NumberFormat().format(maxPrice);
                }
                if (priceMinValueLabel) {
                    priceMinValueLabel.textContent = new Intl.NumberFormat().format(minPrice);
                }

                // به‌روزرسانی UI صفحه‌بندی
                if (InUpdatePaging) {
                    const container = document.querySelector(".book-paging__cards__container");
                    if (container) {
                        const nextPage = container.querySelector(".book-nextpage");
                        const prevPage = container.querySelector(".book-prevpage");
                        
                        if (prevPage) {
                            prevPage.classList.add("book-hidden");
                        }

                        const roundedNumber = Math.ceil(currentIndex / 30);
                        const activePage = selectedIndex !== -1 ? Math.floor(selectedIndex / 30) : 0;
                        const maxVisiblePages = 5;
                        const startPage = Math.max(0, activePage - Math.floor(maxVisiblePages / 2));
                        const endPage = Math.min(roundedNumber, startPage + maxVisiblePages);
                        const adjustedStartPage = endPage - startPage < maxVisiblePages ? Math.max(0, endPage - maxVisiblePages) : startPage;

                        const arrayPaging = Array.from({ length: roundedNumber }, (_, i) => ({
                            index: i,
                            page: i + 1,
                            isActive: i === activePage,
                            isVisible: i >= adjustedStartPage && i < endPage
                        }));

                        if (nextPage) {
                            nextPage.classList.toggle("book-hidden", arrayPaging.length <= 1);
                        }
                        
                        if (args.context && typeof args.context.setAsSource === 'function') {
                            args.context.setAsSource("bus.paging", arrayPaging);
                        }
                    }
                }

                // به‌روزرسانی فیلترهای اتوبوس
                if (InUpdateFiltering) {
                    const filteringSource = allBusProposals;

                    // ترکیب دیکشنری‌ها برای شرکت‌ها، ارز و مکان‌ها
                    const mergedCarriers = {};
                    const mergedCurrency = {};
                    const mergedLocation = {};
                    dictionaries.forEach(item => {
                        Object.assign(mergedCarriers, item.carriers || {});
                        Object.assign(mergedCurrency, item.currency || {});
                        Object.assign(mergedLocation, item.location || {});
                    });

                    // بازنشانی لیست‌های شرکت
                    let allCarrierItems = [];

                    // جمع‌آوری آیتم‌های شرکت با قیمت‌های تجزیه شده
                    filteringSource.forEach(item => {
                        const carrierItems = (item.busGroup || []).flatMap(bus =>
                            (bus.routesInfo || []).map(value => ({
                                Name: mergedCarriers[value.busOperatorCode]?.name || "",
                                Logo: mergedCarriers[value.busOperatorCode]?.image || "",
                                Code: value.busOperatorCode || "",
                                NumberOfStops: bus.numberOfStops || 0,
                                BusId: item.busId || "",
                                Price: item.priceInfo?.total ? parseFloat(item.priceInfo.total) : Infinity,
                                Unit: mergedCurrency[item.priceInfo?.currency] || ""
                            }))
                        ).filter(item => item.Name && item.Code && item.Price !== Infinity);

                        allCarrierItems.push(...carrierItems);
                    });

                    // حذف تکراری شرکت‌ها و انتخاب کمترین قیمت
                    const nameToMinPrice = {};
                    allCarrierItems.forEach(item => {
                        if (!nameToMinPrice[item.Name] || nameToMinPrice[item.Name].Price > item.Price) {
                            nameToMinPrice[item.Name] = item;
                        }
                    });
                    const carrierListResult = Object.values(nameToMinPrice).sort((a, b) => a.Price - b.Price);

                    if (args.context && typeof args.context.setAsSource === 'function') {
                        args.context.setAsSource("bus.carriers", carrierListResult);
                    }

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

                    // فیلتر توقف
                    const uniqueStop = filteringSource.flatMap(item =>
                        (item.busGroup || []).map(bus => ({ Name: bus.numberOfStops }))
                    ).filter(item => item.Name != null);

                    const stopListResult = uniqueStop.filter((item, index, self) => 
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    
                    if (args.context && typeof args.context.setAsSource === 'function') {
                        args.context.setAsSource("bus.stops", stopListResult);
                    }

                    // فیلتر نوع اتوبوس
                    const uniqueBusTypes = filteringSource.flatMap(item =>
                        (item.busGroup || []).flatMap(bus =>
                            (bus.routesInfo || []).map(route => ({
                                Name: route.busType || "",
                                Code: route.busType || ""
                            }))
                        )
                    ).filter(item => item.Name && item.Code);

                    const busTypeListResult = uniqueBusTypes.filter((item, index, self) => 
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    
                    if (args.context && typeof args.context.setAsSource === 'function') {
                        args.context.setAsSource("bus.bustypes", busTypeListResult);
                    }

                    // به‌روزرسانی محدوده‌های مدت زمان (در صورت وجود duration در اتوبوس‌ها)
                    const durationsSource = allBusProposals.map(item => 
                        item.busGroup?.[0]?.duration
                    ).filter(Boolean);

                    if (durationsSource.length > 0) {
                        const uniqueDurationsSource = [...new Set(durationsSource)];
                        const timesInMinutes = uniqueDurationsSource.map(convertToMinutes);
                        minDuration = timesInMinutes.length ? Math.min(...timesInMinutes) : 0;
                        maxDuration = timesInMinutes.length ? Math.max(...timesInMinutes) : 0;
                        
                        if (durationMaxValueLabel) {
                            durationMaxValueLabel.textContent = convertToTime(maxDuration);
                        }
                        if (durationMinValueLabel) {
                            durationMinValueLabel.textContent = convertToTime(minDuration);
                        }
                    }
                } else {
                    setTimeout(() => {
                        setupBookCardButtons();
                    }, 0);
                }

                // به‌روزرسانی لیست اتوبوس
                if (args.context && typeof args.context.setAsSource === 'function') {
                    args.context.setAsSource("bus.updated", pagedSource, { keyFieldName: "busId" });
                }
                InUpdateUIProcess = false;
            } else {
                InUpdateUIProcess = false;
                const listContainer = document.querySelector(".book-list__cards__container");
                if (listContainer) {
                    listContainer.innerHTML = `
                        <div class="book-text-center">
                            <div>هیچ اتوبوسی مطابق با فیلترهای شما وجود ندارد.</div>
                            <div class="book-text-zinc-900 book-text-xs book-mt-2">برای مشاهده نتایج، فیلترهای خود را پاک کنید.</div>
                        </div>
                    `;
                }
                
                const container = document.querySelector(".book-paging__cards__container");
                if (container) {
                    const buttons = container.querySelectorAll(".book-paging__container:not(.book-nextpage):not(.book-prevpage)");
                    const nextPage = container.querySelector(".book-nextpage");
                    const prevPage = container.querySelector(".book-prevpage");
                    
                    if (prevPage) prevPage.classList.add("book-hidden");
                    if (nextPage) nextPage.classList.add("book-hidden");
                    buttons.forEach(button => button.remove());
                }
            }
        }

        // پایان نوار پیشرفت
        endProgressBar();
        
    } catch (error) {
        console.error("busManipulation: " + error.message);
        InUpdateUIProcess = false;
        endProgressBar();
    }
};

// توابع کمکی مورد نیاز

/**
 * تبدیل زمان به دقیقه
 * @param {string} timeString - رشته زمان (مثل "02:30")
 * @returns {number} - زمان برحسب دقیقه
 */
function convertToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
}

/**
 * تبدیل دقیقه به فرمت زمان
 * @param {number} minutes - زمان برحسب دقیقه
 * @returns {string} - رشته زمان (مثل "02:30")
 */
function convertToTime(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) return "00:00";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * فرمت کردن قیمت
 * @param {number} price - قیمت
 * @param {string} currency - واحد پول
 * @returns {string} - قیمت فرمت شده
 */
function formatPrice(price, currency) {
    // تبدیل قیمت به عدد در صورت رشته بودن
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (typeof numericPrice !== 'number' || isNaN(numericPrice)) {
        console.warn("formatPrice: Invalid price value:", price);
        return '0';
    }
    
    // فرمت کردن عدد با جداکننده هزارگان فارسی
    const formattedNumber = new Intl.NumberFormat('fa-IR').format(numericPrice);
    
    // اضافه کردن واحد پول
    const currencyUnit = currency || 'ریال';
    return `${formattedNumber} ${currencyUnit}`;
}

/**
 * تنظیم وضعیت چک باکس فیلتر
 * @param {string} containerSelector - سلکتور کانتینر
 * @param {string} value - مقدار
 * @param {boolean} isChecked - وضعیت چک شده
 * @param {string} suffix - پسوند اضافی
 */
function toggleFilterCheckbox(containerSelector, value, isChecked, suffix = "") {
    try {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const checkbox = container.querySelector(`[bc-value="${value}"]`);
        if (checkbox) {
            if (isChecked) {
                checkbox.classList.add('book-filter-checked');
            } else {
                checkbox.classList.remove('book-filter-checked');
            }
        }
    } catch (error) {
        console.error("toggleFilterCheckbox: " + error.message);
    }
}

/**
 * مقداردهی اولیه اسلایدر
 * @param {Element} container - عنصر کانتینر
 * @param {string} sliderType - نوع اسلایدر
 * @param {number} maxValue - حداکثر مقدار
 * @param {number} minValue - حداقل مقدار
 * @param {Element} minLabel - برچسب حداقل
 * @param {Element} maxLabel - برچسب حداکثر
 * @param {Array} range - محدوده
 * @param {string} rangeId - شناسه محدوده
 * @param {string} rangeClass - کلاس محدوده
 */
function initializeSlider(container, sliderType, maxValue, minValue, minLabel, maxLabel, range, rangeId, rangeClass) {
    try {
        if (!container) return;
        
        // پیاده‌سازی منطق اسلایدر بر اساس نیاز
        console.log(`Initializing slider: ${sliderType}`, {
            maxValue, minValue, range, rangeId, rangeClass
        });
    } catch (error) {
        console.error("initializeSlider: " + error.message);
    }
}

/**
 * تغییر SVG بر اساس جهت مرتب‌سازی
 * @param {Element} svgElement - عنصر SVG
 * @param {boolean} isAscending - آیا صعودی است
 */
function toggleSvg(svgElement, isAscending) {
    try {
        if (!svgElement) return;
        
        const iconName = isAscending ? 'sort-up-icon' : 'sort-down-icon';
        svgElement.innerHTML = `<use xlink:href="/booking/images/sprite-booking-icons.svg#${iconName}"></use>`;
    } catch (error) {
        console.error("toggleSvg: " + error.message);
    }
}

/**
 * پایان نوار پیشرفت
 */
function endProgressBar() {
    try {
        const progressBarElement = document.querySelector('.book-progress-bar');
        if (progressBarElement) {
            progressBarElement.style.display = 'none';
        }
        
        // اضافی: پاک کردن timer در صورت وجود
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    } catch (error) {
        console.error("endProgressBar: " + error.message);
    }
}

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
    } catch (error) {
        console.error("updatePriceSlider: " + error.message);
    }
}

/**
 * افزودن div فیلتر (برای موبایل)
 * @param {string} filterId - شناسه فیلتر
 * @param {string} sourceId - شناسه منبع
 * @param {string} value - مقدار
 */
function addFilterDiv(filterId, sourceId, value) {
    try {
        const filterContainer = document.querySelector('.book-mobile-filters');
        if (!filterContainer) return;
        
        const filterDiv = document.createElement('div');
        filterDiv.className = 'book-filter-tag';
        filterDiv.setAttribute('data-filter-id', filterId);
        filterDiv.innerHTML = `
            <span>${value}</span>
            <button onclick="removeFilterDiv('${filterId}')" class="book-filter-remove">×</button>
        `;
        filterContainer.appendChild(filterDiv);
    } catch (error) {
        console.error("addFilterDiv: " + error.message);
    }
}

/**
 * حذف div فیلتر (برای موبایل)
 * @param {string} filterId - شناسه فیلتر
 */
function removeFilterDiv(filterId) {
    try {
        const filterDiv = document.querySelector(`[data-filter-id="${filterId}"]`);
        if (filterDiv) {
            filterDiv.remove();
        }
    } catch (error) {
        console.error("removeFilterDiv: " + error.message);
    }
}

function initializeBusCards(idToFind) {
    try {
        idToFind = String(idToFind).trim();

        if (!listData || !listData.source || !Array.isArray(listData.source._rows)) {
            console.error("listData یا listData.source._rows تعریف نشده یا آرایه نیست");
            return;
        }

        const rows = listData.source._rows;

        let foundObject = rows[0].busProposals.find(item =>
            item.busId && String(item.busId).trim() === idToFind
        );

        if (!foundObject) {
            console.warn("آیتم مورد نظر با busId پیدا نشد:", idToFind);
            return;
        }

        // استخراج تمام آیتم‌های موجود در busGroup (آرایه یا آبجکت با کلید عددی)
        let busGroupArray = [];

        if (Array.isArray(foundObject.busGroup)) {
            busGroupArray = foundObject.busGroup;
        } else if (typeof foundObject.busGroup === 'object' && foundObject.busGroup !== null) {
            busGroupArray = Object.values(foundObject.busGroup);
        }

        console.log(busGroupArray);

        // استفاده صحیح از $bc.setSource
        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource("cms.seat", {
                type: "upselling",
                busId: idToFind,
                busGroup: JSON.stringify(busGroupArray),
                run: true
            });
        }

        const container = document.querySelector(".book-bus-cards-container");
        if (!container) return;

        container.addEventListener("click", (event) => {
            const seeMoreBtn = event.target.closest(".book-see-and-buy-ticket");
            const closeCardBtn = event.target.closest(".book-closeCard");
            const openFirstMenu = event.target.closest(".book-open-first-menu");
            const closeFirstMenu = event.target.closest(".book-first-menu .book-clode-menu");
            const openSecondMenu = event.target.closest(".book-open-second-menu");
            const closeSecondMenu = event.target.closest(".book-second-menu .book-clode-menu");
            const openThirdMenu = event.target.closest(".book-open-third-menu");
            const closeThirdMenu = event.target.closest(".book-third-menu .book-clode-menu");

            const card = event.target.closest(".book-bus-card");
            if (!card) return;

            // باز کردن کارت
            if (seeMoreBtn) {
                seeMoreBtn.classList.add("book-hidden");
                card.querySelectorAll(".book-hidden-elements").forEach(el => el.classList.remove("book-hidden"));
                card.classList.remove("book-h-[240px]");
                card.classList.add("book-h-[482px]");
            }

            // بستن کارت
            if (closeCardBtn) {
                const seeMore = card.querySelector(".book-see-and-buy-ticket");
                if (seeMore) seeMore.classList.remove("book-hidden");
                card.querySelectorAll(".book-hidden-elements").forEach(el => el.classList.add("book-hidden"));
                card.classList.add("book-h-[240px]");
                card.classList.remove("book-h-[482px]");
            }

            // منوی اول
            if (openFirstMenu) {
                const firstMenu = card.querySelector(".book-first-menu");
                if (firstMenu) firstMenu.classList.remove("book-translate-x-[105%]");
            }
            if (closeFirstMenu) {
                const firstMenu = card.querySelector(".book-first-menu");
                if (firstMenu) firstMenu.classList.add("book-translate-x-[105%]");
            }

            // منوی دوم
            if (openSecondMenu) {
                const secondMenu = card.querySelector(".book-second-menu");
                if (secondMenu) secondMenu.classList.remove("book-translate-x-[105%]");
            }
            if (closeSecondMenu) {
                const secondMenu = card.querySelector(".book-second-menu");
                if (secondMenu) secondMenu.classList.add("book-translate-x-[105%]");
            }

            // منوی سوم
            if (openThirdMenu) {
                const thirdMenu = card.querySelector(".book-third-menu");
                if (thirdMenu) thirdMenu.classList.remove("book-translate-x-[105%]");
            }
            if (closeThirdMenu) {
                const thirdMenu = card.querySelector(".book-third-menu");
                if (thirdMenu) thirdMenu.classList.add("book-translate-x-[105%]");
            }
        });

    } catch (error) {
        console.error("initializeBusCards: " + error.message);
    }
}

const onProcessedRenderSeatMap = async (args) => {
    try {
        if (!args || !args.response) {
            console.error("onProcessedRenderSeatMap: Invalid arguments");
            return;
        }

        const { response } = args;
        if (response.status !== 200) return;

        const responseJson = await response.json();
        const renderingContainer = document.querySelector(`.seat-id-${responseJson.busId}`);
        if (!renderingContainer) return;

        const { layout, col, row } = responseJson;
        const columns = parseInt(col, 10); // Number of seats/gaps per row
        const rows = parseInt(row, 10); // Number of rows

        const createSeatButton = (seat, indexInRow) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = seat.number;

            btn.className = `book-bg-center book-bg-cover book-w-[30px] book-h-[34px] book-flex book-justify-center book-items-center`;

            // Add margin to the second seat (index 1) in each row
            if (indexInRow === 1) {
                btn.classList.add('book-mb-[50px]'); // Add right margin for spacing
            }

            if (seat.status === 'reserved') {
                if (seat.gender === 'Female') {
                    btn.classList.add('book-seat-ladies', 'book-text-[#c60055]');
                    btn.title = 'Ladies';
                } else {
                    btn.classList.add('book-seat-by-for-gentlemans', 'book-text-primary-900');
                    btn.title = 'Gentleman';
                }
                btn.disabled = true;
            } else if (seat.status === 'available') {
                btn.classList.add('book-seat-available', 'book-text-zinc-900');
                btn.title = 'Available';
            }

            return btn;
        };

        const createGap = (indexInRow) => {
            const span = document.createElement('span');
            span.className = `book-w-[30px] book-h-[34px]`;
            // Add margin to the gap if it's at index 1
            if (indexInRow === 1) {
                span.classList.add('book-mb-[50px]');
            }
            return span;
        };

        renderingContainer.innerHTML = '';
        let currentRow = null;
        let seatCountInRow = 0;
        let rowCount = 0;

        for (let i = 0; i < layout.length; i++) {
            if (seatCountInRow === 0) {
                // Start a new row
                currentRow = document.createElement('div');
                currentRow.className = 'book-w-full book-flex book-items-center book-gap-2 book-justify-between book-flex-col';
                currentRow.setAttribute('dir', 'ltr');
            }

            const item = layout[i];

            if (item.type === 'seat') {
                const btn = createSeatButton(item, seatCountInRow);
                currentRow.appendChild(btn);
                seatCountInRow++;
            } else if (item.type === 'gap') {
                const gap = createGap(seatCountInRow);
                currentRow.appendChild(gap);
                seatCountInRow++;
            }

            // Complete the row when it reaches the column limit
            if (seatCountInRow === columns) {
                renderingContainer.appendChild(currentRow);
                seatCountInRow = 0;
                rowCount++;
            }
        }

        // Append the last row if it contains items and hasn't been appended
        if (seatCountInRow > 0 && currentRow) {
            // Fill remaining spaces in the last row with gaps if needed
            while (seatCountInRow < columns) {
                const gap = createGap(seatCountInRow);
                currentRow.appendChild(gap);
                seatCountInRow++;
            }
            renderingContainer.appendChild(currentRow);
        }

        // Ensure the total number of rows matches the specified 'row' count
        while (rowCount < rows) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'book-w-full book-flex book-items-center book-gap-2 book-justify-between book-flex-col';
            emptyRow.setAttribute('dir', 'ltr');
            for (let i = 0; i < columns; i++) {
                const gap = createGap(i);
                emptyRow.appendChild(gap);
            }
            renderingContainer.appendChild(emptyRow);
            rowCount++;
        }

    } catch (error) {
        console.error("onProcessedRenderSeatMap: " + error.message);
    }
};

const onProcessedRenderBusRules = async (args) => {
    try {
        if (!args || !args.response) {
            console.error("onProcessedRenderBusRules: Invalid arguments");
            return;
        }

        console.log("onProcessedRenderBusRules", args);
        const { response } = args;
        console.log("onProcessedRenderBusRules", response);
        console.log("onProcessedRenderBusRules", response.status);
        if (response.status !== 200) return;
        
        const responseJson = await response.json();
        console.log("onProcessedRenderBusRules", responseJson);
        
        if (!Array.isArray(responseJson) || responseJson.length === 0) {
            console.error("onProcessedRenderBusRules: Invalid response format");
            return;
        }
        
        const renderingContainer = document.querySelector(`.rule-id-${responseJson[0].busId}`);
        if (!renderingContainer) return;

        const busRules = responseJson[0].busRules;
        if (!Array.isArray(busRules)) {
            console.error("onProcessedRenderBusRules: busRules is not an array");
            return;
        }
        
        renderingContainer.innerHTML = ''; // Clear existing content

        // Create header for cancellation rules
        const headerDiv = document.createElement('div');
        headerDiv.className = 'book-flex book-mb-3 book-mt-9 book-items-center book-gap-3';
        headerDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 6v2.42C22 10 21 11 19.42 11H16V4.01C16 2.9 16.91 2 18.02 2c1.09.01 2.09.45 2.81 1.17C21.55 3.9 22 4.9 22 6Z" stroke="#FF0000" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M2 7v14c0 .83.94 1.3 1.6.8l1.71-1.28c.4-.3.96-.26 1.32.1l1.66 1.67c.39.39 1.03.39 1.42 0l1.68-1.68c.35-.35.91-.39 1.3-.09l1.71 1.28c.66.49 1.6.02 1.6-.8V4c0-1.1.9-2 2-2H6C3 2 2 3.79 2 6v1Z" stroke="#FF0000" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M6.25 10h5.5" stroke="#FF0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
            <p class="book-text-zinc-900 book-font-bold">شرایط استرداد</p>
        `;
        renderingContainer.appendChild(headerDiv);

        let rulesItem = 0;
        const currentRow = document.createElement('div');
        currentRow.className = 'book-flex book-flex-col book-gap-3 book-w-full book-items-center';

        for (let i = 0; i < busRules.length; i++) {
            const item = busRules[i];
            if (!Array.isArray(item.rule)) continue;
            
            for (let j = 0; j < item.rule.length; j++) {
                const rule = item.rule[j];
                if (rule.title === 'cancel rule') {
                    // Split the rule text to extract conditions
                    const conditions = rule.text.split('.');
                    for (let condition of conditions) {
                        if (condition.trim() === '') continue;
                        // Extract percentage and time
                        const percentageMatch = condition.match(/(\d+ درصد)/);
                        const percentage = percentageMatch ? percentageMatch[0] : '';
                        const timeText = condition.replace(/با کسر \d+ درصد/, '').trim();
                        const bgColor = percentage === '10 درصد' ? '#ff8a4c' : '#ff5656';

                        const ruleDiv = document.createElement('div');
                        ruleDiv.className = 'book-w-[90%] book-h-10 book-flex book-justify-center book-items-center book-text-sm book-text-zinc-700 book-p-1 book-relative book-bg-transparent book-border book-border-zinc-500 book-rounded-lg';
                        ruleDiv.innerHTML = `
                            <div class="book-absolute book-p-[2px] book-h-full book-top-0 book-right-0">
                                <span class="book-h-full book-w-10 book-flex book-justify-center book-items-center book-text-white book-bg-[${bgColor}] book-rounded-md">${percentage}</span>
                            </div>
                            <span class="book-mr-5">${timeText}</span>
                        `;
                        currentRow.appendChild(ruleDiv);
                        rulesItem++;
                    }
                }
            }
        }

        if (rulesItem > 0) {
            renderingContainer.appendChild(currentRow);
        }

    } catch (error) {
        console.error("onProcessedRenderBusRules: " + error.message);
    }
};

const submitCard = (element, idToFind) => {
    try {
        if (!listData || !listData.source || !Array.isArray(listData.source._rows)) {
            console.error("submitCard: Invalid listData structure");
            return;
        }

        let busProposalsSource = listData.source._rows;
        let foundObject = busProposalsSource[0].busProposals.find(item =>
            item.busId && String(item.busId).trim() === idToFind
        );

        // If found in either source, proceed
        if (foundObject) {
            foundObject.dictionaries = busProposalsSource[0].dictionaries;
            sessionStorage.setItem('sessionBook', JSON.stringify(foundObject));
            window.location.href = '/bus/book?url=test';
        } else {
            console.error("submitCard: No object found with busId " + idToFind);
        }
    } catch (error) {
        console.error("submitCard: " + error.message);
    }
};