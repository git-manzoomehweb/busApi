/**
 * Global state for session management and UI updates.
 */

const isMobile = document.querySelector('main')?.dataset.mob === "true";
const tripNames = ["اول", "دوم", "سوم", "چهارم"];
let providerDataList = [];
let isClosing = false;
let totalTime = 20 * 60;
let warningShown = false;
let progressTimer;
let progress = 10;
let globalBusProposals = [];
let globalListData = null;
let currentDragType = null;
let priceSliderInitialized = false;
let cardEventsInitialized = false;
let userHasChangedPriceRange = false;
let lastUserMinPrice = 0;
let lastUserMaxPrice = 0;
let isDragging = false;
let dragStartTime = 0;
const DEBOUNCE_DELAY = 150;
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
let schemaId = 0;
const cookieValue = `; ${document.cookie}`;
const cookieParts = cookieValue.split(`; rkey=`);

const setSession = async (args) => {
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
const onCloseConnectionBus = (param) => {
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
let terminalNames = []; // اصلاح شده: این متغیر در کد اصلی تعریف نشده بود
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

let formattedPriceCard;
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
const pagingContainer = document.querySelector(".book-paging__cards__container");

const busManipulation = async (args) => {
    try {
        if (!args || !args.source) {
            console.error("busManipulation: Invalid arguments structure");
            return;
        }
        globalListData = args;
        if (args.source.id === "bus.search" && args.source._rows && Array.isArray(args.source._rows)) {
            const existingBusIds = new Set(globalBusProposals.map(bus => bus.busId));
            args.source._rows.forEach(row => {
                if (Array.isArray(row.busProposals)) {
                    const newBuses = row.busProposals.filter(bus => !existingBusIds.has(bus.busId));
                    globalBusProposals.push(...newBuses);
                    newBuses.forEach(bus => existingBusIds.add(bus.busId));
                }
            });
        }

        listData = args;
        let currentIndex = 0;
        let start = 0;
        let end = 30;
        let dynamicBusProposalsCount = 0;
        elseExecuted = false;
        startProgressBar();

        if (args.source.id === 'cms.page') {
            mustUpdate = true;
            InUpdatePaging = false;
            InUpdateFiltering = false;
            selectedBusId = null;

            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.page");
                return;
            }

            const currentValue = parseInt(args.source.rows[0].value);
            const prevButton = document.querySelector(".book-prevpage");
            const nextButton = document.querySelector(".book-nextpage");

            if (!pagingContainer) {
                console.error("busManipulation: Paging container not found");
                return;
            }

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

            start = currentValue * 30;
            end = start + 30;
            if (prevButton) {
                prevButton.classList.toggle("book-hidden", currentValue === 0);
            }
            const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
            const lastButton = allButtons[allButtons.length - 1];
            if (nextButton) {
                nextButton.classList.toggle("book-hidden", newActive === lastButton);
            }
        }
        else if (args.source.id === 'cms.nextpage') {
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
                activeButton.classList.remove("book-active__paging");
                activeButton.classList.add("bg-white");
                nextPage.classList.add("book-active__paging");
                nextPage.classList.remove("bg-white");

                if (nextPage.classList.contains("book-hidden")) {
                    nextPage.classList.remove("book-hidden");
                    const firstVisible = document.querySelector(".book-paging__container:not(.hidden):not(.book-prevpage):not(.book-nextpage)");
                    if (firstVisible) firstVisible.classList.add("book-hidden");
                }

                if (prevButton) {
                    prevButton.classList.toggle("book-hidden", nextValue === 0);
                }
            }

            const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
            const lastButton = allButtons[allButtons.length - 1];
            if (nextButton) {
                nextButton.classList.toggle("book-hidden", nextPage === lastButton);
            }

            start = nextValue * 30;
            end = start + 30;
        }
        else if (args.source.id === 'cms.prevpage') {
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
                activeButton.classList.remove("book-active__paging");
                activeButton.classList.add("bg-white");
                prevPage.classList.add("book-active__paging");
                prevPage.classList.remove("bg-white");

                if (prevPage.classList.contains("book-hidden")) {
                    prevPage.classList.remove("book-hidden");
                    const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
                    const lastVisible = allButtons.reverse().find(btn => !btn.classList.contains("book-hidden"));
                    if (lastVisible) lastVisible.classList.add("book-hidden");
                }

                if (prevButton) {
                    prevButton.classList.toggle("book-hidden", prevValue === 0);
                }
                if (nextButton) {
                    nextButton.classList.remove("book-hidden");
                }
            }
            start = prevValue * 30;
            end = start + 30;
        }
        else if (args.source.id === "cms.carrier") {
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
        } else if (args.source.id === "cms.originterminal") {
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
        } else if (args.source.id === "cms.destinationterminal") {
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
        else if (args.source.id === "cms.bustype") {
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
                if (isMobile) {
                    removeFilterDiv("bus-type");
                    addFilterDiv("bus-type", "cms.bustype", busTypeValue);
                }
            }
        }
        else if (args.source.id === "cms.departuretime") {
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
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;

            if (!priceSlider) {
                console.error("busManipulation: Price slider not found");
                return;
            }

            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.price");
                return;
            }

            const sliderRect = priceSlider.getBoundingClientRect();
            let isDragging = false;


            const onMouseMove = (e) => {
                if (!isDragging) return;

                const x = Math.min(Math.max(e.clientX - priceSlider.getBoundingClientRect().left, 0), priceSlider.getBoundingClientRect().width);
                const percent = (x / priceSlider.getBoundingClientRect().width) * 100;

                if (args.source.rows[0].value === "min" && percent <= maxPercent) {
                    minPercent = percent;
                } else if (args.source.rows[0].value === "max" && percent >= minPercent) {
                    maxPercent = percent;
                }

                updatePriceSlider();
            };

            const onMouseUp = (e) => {
                if (!isDragging) return;

                isDragging = false;
                const dragDuration = Date.now() - dragStartTime;

                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);

                userHasChangedPriceRange = true;
                lastUserMinPrice = priceRange[0];
                lastUserMaxPrice = priceRange[1];

                clearTimeout(window.priceFilterTimeout);
                const delay = dragDuration < 500 ? 50 : DEBOUNCE_DELAY;

                window.priceFilterTimeout = setTimeout(() => {
                    triggerPriceFilter();
                }, delay);

            };

            // شروع drag
            isDragging = true;
            document.addEventListener("mousedown", function (e) {
                const target = e.target;

                if (target.classList && [...target.classList].some(cls => cls.startsWith("book-thumb__"))) {
                    isDragging = true;
                    dragStartTime = Date.now();
                    document.addEventListener("mousemove", onMouseMove);
                    document.addEventListener("mouseup", onMouseUp);
                }
            });

        }
        else if (args.source.id === "cms.price.update") {
            // مدیریت به‌روزرسانی فیلتر قیمت (internal trigger)
            InUpdateFiltering = false;
            InUpdatePaging = true;
            selectedBusId = null;
            mustUpdate = true;

            console.log("🔄 Price filter update triggered");
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
            console.log("hour", args.source.rows);
            if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
                console.error("busManipulation: Invalid source rows for cms.sort");
                return;
            }

            const sortValue = args.source.rows[0].value;
            console.log("sortValue", sortValue);
            const sortItem = document.querySelector(`[bc-value="${sortValue}"]`);
            console.log("sortItem", sortItem);

            if (!sortItem) {
                console.error("busManipulation: Sort item not found");
                return;
            }

            const sortOrder = sortItem.getAttribute('data-sort');
            const listItems = document.querySelectorAll(".book-sort__cards__container .book-sort__item__content");
            console.log(listItems);
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
         * 🔥 بخش اصلی به‌روزرسانی UI که در کد شما حذف شده بود
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
                    globalBusProposals = []; // ⭐ بازنشانی داده‌های جهانی
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
                        }

                        else if (currentSort.value === "hour") {
                            fieldA = convertToMinutes(a.busGroup?.[0]?.departureTime || "");
                            fieldB = convertToMinutes(b.busGroup?.[0]?.departureTime || "");
                        }


                        else if (currentSort.value === "departure") {
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
            console.log(currencyDict);
            const indexedSource = newSource.map((item, i) => {
                const busGroup = item.busGroup?.[0] || {};
                const routeInfo = busGroup.routesInfo?.[0] || {};
                const price = item.priceInfo?.total || 0;
                const totalCommission = item.priceInfo?.totalCommission || 0;
                const currencyCode = item.priceInfo?.currency || '';
                const originId = busGroup.origin;
                const destinationId = busGroup.destination;
                const carrierCode = routeInfo.busOperatorCode;
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

                    // اطلاعات قیمت
                    baseFare: item.priceInfo?.baseFare || 0,
                    tax: item.priceInfo?.tax || 0,
                    providerFare: item.priceInfo?.providerFare || 0,
                    price: price,
                    totalCommission: totalCommission,
                    formattedPriceCard: price,
                    formattedPrice: formatPrice(price, currencyDict[currencyCode] || ''),
                    formattedTotalCommission: formatPrice(totalCommission, currencyDict[currencyCode] || ''),
                    currency: currencyDict[currencyCode] || '',
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

            console.log(indexedSource, "indexedSource");
            // اعمال صفحه‌بندی
            const pagedSource = indexedSource.slice(start, end);
            BusProposalsSource = pagedSource;
            console.log("pagedSourceeeeeeeeeeeeeeeeee", pagedSource);
            if (pagedSource.length > 0) {
                // به‌روزرسانی محدوده قیمت با قیمت‌های تجزیه شده
                const pricesSource = allBusProposals.map(item =>
                    item.priceInfo?.totalCommission ? parseFloat(item.priceInfo.totalCommission) : null
                ).filter(Boolean);

                // 🔥 تنها در اولین بار یا هنگام دریافت داده‌های جدید، حداقل/حداکثر را به‌روزرسانی کنید
                const shouldUpdateMinMax = newDataCame || (minPrice === 0 && maxPrice === 0);

                if (shouldUpdateMinMax) {
                    minPrice = pricesSource.length ? Math.min(...pricesSource) : 0;
                    maxPrice = pricesSource.length ? Math.max(...pricesSource) : 0;

                    // تنها در صورت عدم تنظیم قبلی، درصدها را اولیه‌سازی کنید
                    if (minPercent === 0 && maxPercent === 100 && priceRange[0] === 0 && priceRange[1] === Infinity) {
                        priceRange = [minPrice, maxPrice];
                    }
                }

                // 🔥 همیشه لیبل‌ها را با مقادیر انتخاب شده به‌روزرسانی کنید، نه حداقل/حداکثر اصلی
                const currentMinPrice = priceRange[0] || minPrice;
                const currentMaxPrice = priceRange[1] || maxPrice;

                // در بخش به‌روزرسانی لیبل‌ها:
                if (priceMaxValueLabel) {
                    const displayMaxPrice = userHasChangedPriceRange ? lastUserMaxPrice : maxPrice;
                    priceMaxValueLabel.textContent = new Intl.NumberFormat().format(displayMaxPrice);
                }
                if (priceMinValueLabel) {
                    const displayMinPrice = userHasChangedPriceRange ? lastUserMinPrice : minPrice;
                    priceMinValueLabel.textContent = new Intl.NumberFormat().format(displayMinPrice);
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

                        console.log("arrayPaging", arrayPaging);

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
                }

                // به‌روزرسانی لیست اتوبوس
                if (args.context && typeof args.context.setAsSource === 'function') {
                    args.context.setAsSource("bus.updated", pagedSource, { keyFieldName: "busId" });
                }
                setTimeout(() => {
                    preservePriceLabels();
                }, 10); // تأخیر کوتاه برای اطمینان از کامل شدن به‌روزرسانی

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
 * Renders a pagination button for flight search results.
 * @param {Object} element - Pagination data with index, page, isActive, and isVisible properties
 * @returns {string} HTML string for the pagination button
 */
const renderPaging = async (element) => {
    try {
        console.log(element, "paging");
        const { index, page, isActive, isVisible } = element;
        const nextPage = pagingContainer?.querySelector(".book-nextpage");
        const prevPage = pagingContainer?.querySelector(".book-prevpage");

        // Show next button if there are more than 5 pages
        if (index >= 5 && nextPage?.classList.contains("book-hidden")) {
            nextPage.classList.remove("book-hidden");
        }

        // Show previous button if not on the first active page
        if (index > 0 && isActive && prevPage?.classList.contains("book-hidden")) {
            prevPage.classList.remove("book-hidden");
        }

        // Render button with active/visible styling
        // This code is for the mobile version
        return `<button class="book-paging__container book-leading-9 book-border book-border-solid book-border-zinc-200 book-rounded-lg book-w-8 book-h-8${isActive ? ' book-active__paging' : ' book-bg-white'} ${isVisible ? '' : ' book-hidden'}" type="button" bc-value="${index}" bc-name="cms.page" bc-triggers="click">${page}</button>`;
    } catch (error) {
        console.error(`renderPaging: ${error.message}`);
        return "";
    }
};


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


// function toggleFilterCheckbox(containerSelector, value, isChecked, suffix = "") {
//     try {
//       console.log("toggleFilterCheckbox::::::::::::::::::::::::::::::::",containerSelector, value, isChecked, suffix);
//         const container = document.querySelector(containerSelector);
//         if (!container) return;

//         const checkbox = container.querySelector(`[bc-value="${value}"]`);
//         if (checkbox) {
//             if (isChecked) {
//                 checkbox.closest(".book-filter__item").classList.add('book-checked');
//             } else {
//                 checkbox.closest(".book-filter__item").classList.remove('book-checked');
//             }
//         }
//     } catch (error) {
//         console.error("toggleFilterCheckbox: " + error.message);
//     }
// }



const toggleFilterCheckbox = (selector, value, isChecked, itemSelector = ".book-filter__item") => {
    try {

        const part = selector.match(/\.book-([a-zA-Z0-9_-]+?)__/)[1];
        const element = document.querySelector(selector)?.querySelector(`[bc-value="${value}"]`);
        const target = itemSelector ? element?.closest(itemSelector) : element;
        const isSpecialCase =
            selector.includes("book-departuretime__content");

        if (isSpecialCase && element) {
            // For specific selectors, toggle class directly on element
            if (isChecked) {
                element.classList.add("book-checked");
            } else {
                element.classList.remove("book-checked");
            }

            // Handle mobile add/remove filter
            if (isMobile) {
                if (isChecked) {
                    addFilterDiv(value, `cms.${part}`, '', element.dataset.textshow);
                } else {
                    removeFilterDiv(value);
                }
            }
        } else {

            // Default behavior for all other selectors
            if (target) {
                target.classList.toggle("book-checked", isChecked);
            }
            if (isMobile) {
                if (isChecked) {
                    addFilterDiv(value, `cms.${part}`, '', element?.dataset.textshow);
                } else {
                    removeFilterDiv(value);
                }
            }
        }
    } catch (error) {
        console.error("toggleFilterCheckbox: " + error.message);
    }
};




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
const updatePriceSlider = () => {
    try {
        const totalRange = maxPrice - minPrice;
        const priceMinValue = Math.round((minPercent / 100) * totalRange + minPrice);
        const priceMaxValue = Math.round((maxPercent / 100) * totalRange + minPrice);

        // به‌روزرسانی فوری priceRange در همین لحظه
        priceRange = [priceMinValue, priceMaxValue];

        // 🔥 به‌روزرسانی نمایش قیمت‌ها با مقادیر انتخاب شده (نه حداقل/حداکثر اصلی)
        if (priceMinValueLabel) {
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(priceMinValue);
        }
        if (priceMaxValueLabel) {
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(priceMaxValue);
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

        // فراخوانی updateFilterDisplay برای موبایل (اگر موجود باشد)
        if (typeof updateFilterDisplay === 'function') {
            updateFilterDisplay(
                "price",
                "price-range",
                priceMinValue,
                priceMaxValue,
                minPrice,
                maxPrice,
                null,
                null
            );
        }

        console.log(`💰 Price Range Updated: ${priceMinValue} - ${priceMaxValue}`);

    } catch (error) {
        console.error(`updatePriceSlider: ${error.message}`);
    }
};

const preservePriceLabels = () => {
    try {
        // محاسبه مقادیر فعلی بر اساس درصدها
        const totalRange = maxPrice - minPrice;
        const currentMinPrice = Math.round((minPercent / 100) * totalRange + minPrice);
        const currentMaxPrice = Math.round((maxPercent / 100) * totalRange + minPrice);

        // به‌روزرسانی لیبل‌ها با مقادیر فعلی
        if (priceMinValueLabel) {
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(currentMinPrice);
        }
        if (priceMaxValueLabel) {
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(currentMaxPrice);
        }

        console.log(`🏷️ Labels preserved: ${currentMinPrice} - ${currentMaxPrice}`);

    } catch (error) {
        console.error("preservePriceLabels: " + error.message);
    }
};

function triggerPriceFilter() {
    try {
        // تنظیم flag برای به‌روزرسانی
        mustUpdate = true;

        // استفاده از BasisCore برای تریگر کردن فیلتر
        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource("cms.price", {
                value: "range",
                minPrice: priceRange[0],
                maxPrice: priceRange[1],
                run: true
            });
        } else {
            // fallback در صورت عدم دسترسی به $bc
            busManipulation({
                source: {
                    id: 'cms.price.update',
                    rows: [{
                        value: 'range',
                        minPrice: priceRange[0],
                        maxPrice: priceRange[1]
                    }]
                },
                context: {
                    setAsSource: function (sourceId, data) {
                        console.log(`Setting source ${sourceId}:`, data);
                    },
                    tryToGetSource: function (sourceId) {
                        if (sourceId === "bus.search") {
                            return listData?.source || null;
                        }
                        return null;
                    }
                }
            });
        }

        console.log(`🎯 Price Filter Triggered: ${priceRange[0]} - ${priceRange[1]}`);

    } catch (error) {
        console.error("triggerPriceFilter: " + error.message);
    }
}

function handlePriceDrag(args) {
    try {

        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }

        if (!priceSlider) {
            return;
        }

        cleanupSliderEvents();

        const sliderRect = priceSlider.getBoundingClientRect();
        const sliderType = args.source.rows[0].value;
        const thumbElement = sliderType === "min" ? priceThumbMin : priceThumbMax;

        if (!thumbElement) return;

        isDragging = true;
        isSliderActive = true;
        dragStartTime = Date.now();

        currentMouseMoveHandler = (e) => {
            if (!isDragging || !isSliderActive) return;

            const x = Math.min(Math.max(e.clientX - sliderRect.left, 0), sliderRect.width);
            const percent = (x / sliderRect.width) * 100;

            if (sliderType === "min" && percent <= maxPercent) {
                minPercent = percent;
            } else if (sliderType === "max" && percent >= minPercent) {
                maxPercent = percent;
            }

            updatePriceSlider();
        };

        currentMouseUpHandler = () => {
            if (!isDragging || !isSliderActive) return;

            isDragging = false;
            isSliderActive = false;

            // پاکسازی
            document.removeEventListener("mousemove", currentMouseMoveHandler);
            thumbElement.removeEventListener("mouseup", currentMouseUpHandler);
            // window.removeEventListener("mouseup", currentMouseUpHandler);

            userHasChangedPriceRange = true;
            lastUserMinPrice = priceRange[0];
            lastUserMaxPrice = priceRange[1];

            clearTimeout(window.priceFilterTimeout);
            window.priceFilterTimeout = setTimeout(() => {
                triggerPriceFilter();
            }, 150);

            console.log(`🖱️ Price Drag Ended: ${sliderType}`);
        };

        // 🔥 کلیدی: mousemove روی document، mouseup روی thumb + window
        document.addEventListener("mousemove", currentMouseMoveHandler, { passive: true });
        thumbElement.addEventListener("mouseup", currentMouseUpHandler, { once: true }); // اصلی
        // window.addEventListener("mouseup", currentMouseUpHandler, { once: true }); // fallback

        console.log(`🖱️ Price Drag Started: ${sliderType}`);

    } catch (error) {
        console.error("handlePriceDrag: " + error.message);
        cleanupSliderEvents();
    }
}

function initializePriceSlider() {
    try {
        if (!priceSlider || !priceThumbMin || !priceThumbMax) {
            console.error("Price slider elements not found");
            return;
        }

        // حذف event listener های قبلی
        priceThumbMin.removeEventListener("mousedown", handlePriceSliderMouseDown);
        priceThumbMax.removeEventListener("mousedown", handlePriceSliderMouseDown);

        // اضافه کردن event listener های جدید
        priceThumbMin.addEventListener("mousedown", (e) => {
            e.preventDefault();
            handlePriceDrag({
                source: {
                    id: "cms.price",
                    rows: [{ value: "min" }]
                }
            });
        });

        priceThumbMax.addEventListener("mousedown", (e) => {
            e.preventDefault();
            handlePriceDrag({
                source: {
                    id: "cms.price",
                    rows: [{ value: "max" }]
                }
            });
        });

        console.log("✅ Price slider initialized successfully");

    } catch (error) {
        console.error("initializePriceSlider: " + error.message);
    }
}


const resetPriceFilter = () => {
    try {
        minPercent = 0;
        maxPercent = 100;
        priceRange = [minPrice, maxPrice];

        // 🔥 بازنشانی وضعیت تغییرات کاربر
        userHasChangedPriceRange = false;
        lastUserMinPrice = minPrice;
        lastUserMaxPrice = maxPrice;

        updatePriceSlider();

        // اعمال فیلتر
        mustUpdate = true;
        if (typeof busManipulation === 'function') {
            busManipulation({
                source: {
                    id: 'cms.price.update',
                    rows: [{ value: 'reset' }]
                },
                context: {
                    setAsSource: function () { },
                    tryToGetSource: function () { return null; }
                }
            });
        }

        console.log("🔄 Price filter reset");

    } catch (error) {
        console.error("resetPriceFilter: " + error.message);
    }
};



const debugPriceFilter = () => {
    console.group("🔍 Price Filter Debug Info");
    console.log("Min Price:", minPrice);
    console.log("Max Price:", maxPrice);
    console.log("Min Percent:", minPercent);
    console.log("Max Percent:", maxPercent);
    console.log("Price Range:", priceRange);
    console.log("mustUpdate:", mustUpdate);
    console.log("InUpdateFiltering:", InUpdateFiltering);
    console.log("InUpdatePaging:", InUpdatePaging);
    console.groupEnd();
};


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


const updateHourSlider = (type, label, minHour, maxHour, hourContainer, hourRange) => {
    try {
        // Get current percentages based on type
        let currentMinPercent = type === "outboundhour" ? (outboundMinPercent || 0) : type === "inboundhour" ? (inboundMinPercent || 0) : (minPercent || 0);
        let currentMaxPercent = type === "outboundhour" ? (outboundMaxPercent || 100) : type === "inboundhour" ? (inboundMaxPercent || 100) : (maxPercent || 100);

        // Get slider elements
        const hourMinValueLabel = hourContainer.querySelector(".book-min__value");
        const hourMaxValueLabel = hourContainer.querySelector(".book-max__value");
        const hourThumbMin = hourContainer.querySelector(".book-thumb__min");
        const hourThumbMax = hourContainer.querySelector(".book-thumb__max");
        const hourTrack = hourContainer.querySelector(".book-slider__track");

        // Calculate values
        const totalRange = maxHour - minHour;
        const hourMinValue = Math.round((currentMinPercent / 100) * totalRange + minHour);
        const hourMaxValue = Math.round((currentMaxPercent / 100) * totalRange + minHour);

        // Update labels
        hourMinValueLabel.textContent = `${Math.floor(hourMinValue / 60)} ساعت ${hourMinValue % 60} دقیقه`;
        hourMaxValueLabel.textContent = `${Math.floor(hourMaxValue / 60)} ساعت ${hourMaxValue % 60} دقیقه`;

        // Update range array
        hourRange[0] = hourMinValue;
        hourRange[1] = hourMaxValue;

        // Update slider UI
        hourThumbMin.style.left = `${currentMinPercent}%`;
        hourThumbMax.style.left = `${currentMaxPercent}%`;
        hourTrack.style.left = `${currentMinPercent}%`;
        hourTrack.style.right = `${100 - currentMaxPercent}%`;

        // Update filter display
        updateFilterDisplay(type, label, hourMinValue, hourMaxValue, minHour, maxHour, hourContainer, hourRange);
    } catch (error) {
        console.error(`updateHourSlider (${type}): ${error.message}`);
    }
};


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
// ⭐ تابع کمکی برای پیدا کردن داده‌ها از منابع مختلف
function findBusData(idToFind) {
    const cleanId = String(idToFind).trim();

    // جستجو در داده‌های جهانی
    let foundObject = globalBusProposals.find(item =>
        item && item.busId && String(item.busId).trim() === cleanId
    );

    if (foundObject) {
        return { object: foundObject, source: 'global' };
    }

    // جستجو در allBusProposals
    foundObject = allBusProposals.find(item =>
        item && item.busId && String(item.busId).trim() === cleanId
    );

    if (foundObject) {
        return { object: foundObject, source: 'allBusProposals' };
    }

    // جستجو در listData
    if (globalListData && globalListData.source && Array.isArray(globalListData.source._rows)) {
        const rows = globalListData.source._rows;
        if (rows.length && Array.isArray(rows[0].busProposals)) {
            foundObject = rows[0].busProposals.find(item =>
                item && item.busId && String(item.busId).trim() === cleanId
            );
            if (foundObject) {
                return { object: foundObject, source: 'listData' };
            }
        }
    }

    // جستجو در BusProposalsSource (داده‌های فیلتر شده)
    if (Array.isArray(BusProposalsSource)) {
        foundObject = BusProposalsSource.find(item =>
            item && item.busId && String(item.busId).trim() === cleanId
        );
        if (foundObject) {
            return { object: foundObject, source: 'BusProposalsSource' };
        }
    }

    return null;
}


// 🔥 فقط این تابع را جایگزین کنید - باقی کد همان قبلی باشد
function initializeBusCards(idToFind) {
    try {
        const cleanId = String(idToFind).trim().replace(/[^a-zA-Z0-9]/g, '');
        console.log("🔍 Searching for bus ID:", cleanId);

        // استفاده از تابع کمکی برای پیدا کردن داده
        const result = findBusData(idToFind);

        if (!result) {
            console.warn("⚠️ آیتم مورد نظر با busId پیدا نشد:", cleanId);

            // تلاش مجدد با ID اصلی (بدون پاکسازی)
            const originalResult = findBusData(idToFind);
            if (!originalResult) {
                console.error("❌ هیچ داده‌ای برای busId یافت نشد:", idToFind);
                return;
            }
            result.object = originalResult.object;
            result.source = originalResult.source;
        }

        console.log("✅ داده پیدا شد از منبع:", result.source);

        const foundObject = result.object;

        // استخراج busGroup
        let busGroupArray = [];
        if (Array.isArray(foundObject.busGroup)) {
            busGroupArray = foundObject.busGroup;
        } else if (typeof foundObject.busGroup === 'object' && foundObject.busGroup !== null) {
            busGroupArray = Object.values(foundObject.busGroup);
        }

        console.log("🚌 busGroupArray:", busGroupArray);

        // تنظیم $bc.setSource
        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource("cms.seat", {
                type: "upselling",
                busId: idToFind,
                busGroup: JSON.stringify(busGroupArray),
                run: true
            });
            console.log("🟢 $bc.setSource اجرا شد");
        }

        // 🔥 مدیریت رویدادهای کلیک - بدون تداخل
        const container = document.querySelector(".book-bus-cards-container");
        if (!container) {
            console.error("❌ کانتینر .book-bus-cards-container پیدا نشد");
            return;
        }
        console.log("🟡 کانتینر پیدا شد:", container);

        // 🔥 فقط حذف و اضافه مجدد event listener برای این container
        // حذف listener قبلی اگر وجود دارد
        if (container._busCardHandler) {
            container.removeEventListener("click", container._busCardHandler);
            console.log("🟠 Event listener قبلی حذف شد");
        }

        // تعریف handler جدید
        const busCardHandler = (event) => {
            console.log("🟢 کلیک شد روی:", event.target);
            const seeMoreBtn = event.target.closest(".book-see-and-buy-ticket");
            const closeCardBtn = event.target.closest(".book-closeCard");
            const openFirstMenu = event.target.closest(".book-open-first-menu");
            const closeFirstMenu = event.target.closest(".book-first-menu .book-clode-menu");
            const openSecondMenu = event.target.closest(".book-open-second-menu");
            const closeSecondMenu = event.target.closest(".book-second-menu .book-clode-menu");
            const openThirdMenu = event.target.closest(".book-open-third-menu");
            const closeThirdMenu = event.target.closest(".book-third-menu .book-clode-menu");

            const card = event.target.closest(".book-bus-card");
            console.log("🟡 card پیدا شده؟", card);
            if (!card) return;

            console.log("🔵 seeMoreBtn:", seeMoreBtn, "closeCardBtn:", closeCardBtn);

            // باز کردن کارت
            if (seeMoreBtn) {
                event.stopPropagation(); // جلوگیری از bubbling
                console.log("🟢 باز کردن کارت شروع شد");
                seeMoreBtn.classList.add("book-hidden");
                card.querySelectorAll(".book-hidden-elements").forEach(el => {
                    console.log("🟣 حذف book-hidden از:", el);
                    el.classList.remove("book-hidden");
                });
                card.classList.remove("book-h-[240px]");
                card.classList.add("book-h-[482px]");
                console.log("🟢 وضعیت کارت بعد از باز شدن:", card.className);
                console.log("🟡 وضعیت نهایی کارت:", card.outerHTML);
            }

            // بستن کارت
            if (closeCardBtn) {
                event.stopPropagation(); // جلوگیری از bubbling
                console.log("🔴 بستن کارت شروع شد");
                const seeMore = card.querySelector(".book-see-and-buy-ticket");
                if (seeMore) seeMore.classList.remove("book-hidden");
                card.querySelectorAll(".book-hidden-elements").forEach(el => {
                    console.log("🟣 اضافه کردن book-hidden به:", el);
                    el.classList.add("book-hidden");
                });
                card.classList.add("book-h-[240px]");
                card.classList.remove("book-h-[482px]");
                console.log("🔴 وضعیت کارت بعد از بسته شدن:", card.className);
                console.log("🟡 وضعیت نهایی کارت:", card.outerHTML);
            }

            // منوهای مختلف
            if (openFirstMenu) {
                const firstMenu = card.querySelector(".book-first-menu");
                if (firstMenu) firstMenu.classList.remove("book-translate-x-[105%]");
                console.log("🟢 منوی اول باز شد");
            }
            if (closeFirstMenu) {
                const firstMenu = card.querySelector(".book-first-menu");
                if (firstMenu) firstMenu.classList.add("book-translate-x-[105%]");
                console.log("🔴 منوی اول بسته شد");
            }

            if (openSecondMenu) {
                const secondMenu = card.querySelector(".book-second-menu");
                if (secondMenu) secondMenu.classList.remove("book-translate-x-[105%]");
                console.log("🟢 منوی دوم باز شد");
            }
            if (closeSecondMenu) {
                const secondMenu = card.querySelector(".book-second-menu");
                if (secondMenu) secondMenu.classList.add("book-translate-x-[105%]");
                console.log("🔴 منوی دوم بسته شد");
            }

            if (openThirdMenu) {
                const thirdMenu = card.querySelector(".book-third-menu");
                if (thirdMenu) thirdMenu.classList.remove("book-translate-x-[105%]");
                console.log("🟢 منوی سوم باز شد");
            }
            if (closeThirdMenu) {
                const thirdMenu = card.querySelector(".book-third-menu");
                if (thirdMenu) thirdMenu.classList.add("book-translate-x-[105%]");
                console.log("🔴 منوی سوم بسته شد");
            }
        };

        // ذخیره reference و اضافه کردن listener جدید
        container._busCardHandler = busCardHandler;
        container.addEventListener("click", busCardHandler);
        console.log("✅ Event listener جدید اضافه شد");

        // مشاهده تغییرات DOM برای دیباگ
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                console.log("🟠 تغییر در DOM:", mutation);
            });
        });
        observer.observe(container, { attributes: true, childList: true, subtree: true });
        console.log("🟡 MutationObserver فعال شد");

        console.log("✅ initializeBusCards تکمیل شد");

    } catch (error) {
        console.error("❌ initializeBusCards: " + error.message);
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

        // استفاده از CSS.escape برای حل مشکل selector
        const busId = responseJson.busId;
        const escapedBusId = CSS.escape(busId);
        const renderingContainer = document.querySelector(`.seat-id-${escapedBusId}`);

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
            rowCount++;
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

        const { response } = args;
        if (response.status !== 200) return;

        const responseJson = await response.json();

        if (!Array.isArray(responseJson) || responseJson.length === 0) {
            console.error("onProcessedRenderBusRules: Invalid response format");
            return;
        }

        // استفاده از CSS.escape برای حل مشکل
        const busId = responseJson[0].busId;
        const escapedBusId = CSS.escape(busId);
        const renderingContainer = document.querySelector(`.rule-id-${escapedBusId}`);

        if (!renderingContainer) {
            console.warn(`Container with class rule-id-${escapedBusId} not found`);
            return;
        }

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
                            <span class="book-mx-1">${timeText}</span>
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
const onProcessedRenderBusRules_Alternative1 = async (args) => {
    try {
        if (!args || !args.response) {
            console.error("onProcessedRenderBusRules: Invalid arguments");
            return;
        }

        const { response } = args;
        if (response.status !== 200) return;

        const responseJson = await response.json();

        if (!Array.isArray(responseJson) || responseJson.length === 0) {
            console.error("onProcessedRenderBusRules: Invalid response format");
            return;
        }

        // 🔥 راه‌حل 2: استفاده از data attribute
        const busId = responseJson[0].busId;
        const renderingContainer = document.querySelector(`[data-rule-id="${busId}"]`);

        if (!renderingContainer) {
            console.warn(`Container with data-rule-id="${busId}" not found`);
            return;
        }

        // بقیه کد مشابه راه‌حل اول...
        // ...

    } catch (error) {
        console.error("onProcessedRenderBusRules: " + error.message);
    }
};

const onProcessedRenderBusRules_Alternative2 = async (args) => {
    try {
        if (!args || !args.response) {
            console.error("onProcessedRenderBusRules: Invalid arguments");
            return;
        }

        const { response } = args;
        if (response.status !== 200) return;

        const responseJson = await response.json();

        if (!Array.isArray(responseJson) || responseJson.length === 0) {
            console.error("onProcessedRenderBusRules: Invalid response format");
            return;
        }

        // 🔥 راه‌حل 3: پاک کردن کاراکترهای غیرمجاز
        const busId = responseJson[0].busId;
        const cleanBusId = busId.replace(/[^a-zA-Z0-9_-]/g, ''); // فقط حروف، اعداد، - و _ نگه داشته می‌شود
        const renderingContainer = document.querySelector(`.rule-id-${cleanBusId}`);

        if (!renderingContainer) {
            console.warn(`Container with class rule-id-${cleanBusId} not found`);
            return;
        }

        // بقیه کد مشابه راه‌حل اول...
        // ...

    } catch (error) {
        console.error("onProcessedRenderBusRules: " + error.message);
    }
};

const onProcessedRenderBusRules_Alternative3 = async (args) => {
    try {
        if (!args || !args.response) {
            console.error("onProcessedRenderBusRules: Invalid arguments");
            return;
        }

        const { response } = args;
        if (response.status !== 200) return;

        const responseJson = await response.json();

        if (!Array.isArray(responseJson) || responseJson.length === 0) {
            console.error("onProcessedRenderBusRules: Invalid response format");
            return;
        }

        // 🔥 راه‌حل 4: استفاده از ID به جای class
        const busId = responseJson[0].busId;
        const renderingContainer = document.getElementById(`rule-id-${busId}`);

        if (!renderingContainer) {
            console.warn(`Container with id="rule-id-${busId}" not found`);
            return;
        }

        // بقیه کد مشابه راه‌حل اول...
        // ...

    } catch (error) {
        console.error("onProcessedRenderBusRules: " + error.message);
    }
};

function escapeCSSSelector(str) {
    // اگر CSS.escape موجود است (مرورگرهای جدید)
    if (typeof CSS !== 'undefined' && CSS.escape) {
        return CSS.escape(str);
    }

    // fallback برای مرورگرهای قدیمی
    return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

function cleanCSSClassName(str) {
    // فقط حروف انگلیسی، اعداد، خط تیره و زیرخط مجاز هستند
    return str.replace(/[^a-zA-Z0-9_-]/g, '');
}



// 🔥 تابع اصلاح شده submitCard - جایگزین کردن کامل
const submitCard = (element, idToFind) => {
    try {
        console.log("🎫 شروع submitCard برای ID:", idToFind);

        // استفاده از تابع کمکی برای پیدا کردن داده
        const result = findBusData(idToFind);

        if (!result) {
            console.error("❌ submitCard: هیچ آبجکتی با busId پیدا نشد:", idToFind);

            // نمایش اطلاعات debug برای کمک به عیب‌یابی
            console.log("📊 Debug Info:");
            console.log("- globalBusProposals length:", globalBusProposals.length);
            console.log("- allBusProposals length:", allBusProposals?.length || 0);
            console.log("- BusProposalsSource length:", BusProposalsSource?.length || 0);
            console.log("- globalListData exists:", !!globalListData);

            if (globalListData?.source?._rows?.[0]?.busProposals) {
                console.log("- listData busProposals length:", globalListData.source._rows[0].busProposals.length);
            }

            return;
        }

        console.log("✅ داده پیدا شد از منبع:", result.source);

        const foundObject = result.object;

        // اضافه کردن dictionaries در صورت وجود
        if (!foundObject.dictionaries) {
            // جستجو در منابع مختلف برای dictionaries
            if (globalListData?.source?._rows?.[0]?.dictionaries) {
                foundObject.dictionaries = globalListData.source._rows[0].dictionaries;
            } else if (dictionaries && dictionaries.length > 0) {
                foundObject.dictionaries = dictionaries[0];
            }
        }

        // ذخیره در sessionStorage و redirect
        sessionStorage.setItem('sessionBook', JSON.stringify(foundObject));
        console.log("💾 داده در sessionStorage ذخیره شد");

        window.location.href = '/bus/book?url=test';
        console.log("🔄 در حال انتقال به صفحه booking...");

    } catch (error) {
        console.error("❌ submitCard: " + error.message);
        console.log("📊 Error Debug Info:");
        console.log("- idToFind:", idToFind);
        console.log("- element:", element);
        console.log("- globalBusProposals:", globalBusProposals);
        console.log("- globalListData:", globalListData);
    }
};

// ⭐ تابع کمکی برای debug کردن وضعیت داده‌ها
function debugDataState() {
    console.group("🔍 Data State Debug");
    console.log("globalBusProposals:", globalBusProposals?.length || 0);
    console.log("allBusProposals:", allBusProposals?.length || 0);
    console.log("BusProposalsSource:", BusProposalsSource?.length || 0);
    console.log("globalListData exists:", !!globalListData);
    console.log("dictionaries:", dictionaries?.length || 0);

    if (globalListData?.source?._rows?.[0]?.busProposals) {
        console.log("listData busProposals:", globalListData.source._rows[0].busProposals.length);
    }

    console.groupEnd();
}



/**
* Toggles the visibility of a content container and its arrow icon.
* @param {HTMLElement} element - The element triggering the toggle.
*/
const toggleContent = (element) => {
    try {
        const selectorContainer = element.closest(".book-selector__container");
        const content = selectorContainer.querySelector(".book-selector__content");
        content.classList.toggle("book-hidden");
        toggleArrowIcon(element.querySelector("svg use"));
    } catch (error) {
        console.error(`toggleContent: ${error.message}`);
    }
};
