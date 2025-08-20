/**
 * Global state for session management and UI updates.
 */

let translations = {};
let currentLanguage = document.documentElement.lang || 'fa';
let isRTL = document.documentElement.dir === 'rtl' || currentLanguage === 'fa' || currentLanguage === 'ar';

const isMobile = document.querySelector("main")?.dataset.mob === "true";
let tripNames = [];
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
const modalContainer = document.querySelector(
  ".book-expire__message__modal__container"
);
const someTime = modalContainer?.querySelector(".book-some__time");
const noTime = modalContainer?.querySelector(".book-no__time");
let inboundMinPercent = 0;
let inboundMaxPercent = 100;
let outboundMinPercent = 0;
let outboundMaxPercent = 100;
let listData;
let sessionSearchStorage = sessionStorage.getItem("sessionSearch")
  ? JSON.parse(sessionStorage.getItem("sessionSearch"))
  : {};
let schemaId = 0;
const cookieValue = `; ${document.cookie}`;
const cookieParts = cookieValue.split(`; rkey=`);
let cleanTripGroup = [];







const loadTranslations = async (lang = 'fa') => {
    try {
        const response = await fetch(`/json/translations`);
        const allTranslations = await response.json();
        translations = allTranslations;
        tripNames = [translate("first_route"), translate("second_route"), translate("third_route"), translate("fourth_route")];
    } catch (error) {
        console.error('loadTranslations:', error);
    }
}

// Function to translate text
const translate = (text) => {
    try {
        return translations[text] ? translations[text][currentLanguage] : text;
    } catch (error) {
        console.error('translate:', error);
    }
};
// Function to apply direction-specific styles
const applyDirectionStyles = async () => {
    try {
        const direction = isRTL ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = currentLanguage;

        // Use existing book-rtl and book-ltr classes
        document.body.classList.toggle('book-rtl', isRTL);
        document.body.classList.toggle('book-ltr', !isRTL);
    } catch (error) {
        console.error('applyDirectionStyles:', error);
    }
};

document.addEventListener("DOMContentLoaded", async function () {

    // Initialize translation
    await loadTranslations();
    // Initialize direction styles
    await applyDirectionStyles();
    sessionStorage.removeItem('sessionAmenities');
    fetch("/booking/images/sprite-booking-icons.svg")
        .then((res) => res.text())
        .then((svgText) => {
            const div = document.createElement("div");
            div.style.display = "none"; // Hide the container from view
            div.innerHTML = svgText;
            document.body.insertBefore(div, document.body.firstChild); // Inject the SVG sprite at the beginning of <body>
        })
        .catch((err) => {
            console.error(translate("SVG sprite load error") + ":", err);
        });

});


const getSearchCookie = (element) => {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${element}=`);
        return parts.length === 2 ? parts.pop().split(';').shift() : null;
    } catch (error) {
        console.error("getSearchCookie: " + error.message);
        return null;
    }
};

async function setSession(args) {
  try {

    console.log("setsession:" , args)
    if (!sessionSearchStorage) return;

    // --- ثابت‌ها/حالت‌ها
    const MODE = 'bus';

    // --- به‌روزرسانی داده‌های سشن

      sessionSearchStorage.SessionId = args.source.rows[0].sessionId;

    sessionSearchStorage.rkey = getSearchCookie("rkey") || "";
    sessionSearchStorage.selectedMode = MODE;

    // TTL (20 دقیقه)
    const ttl = 20 * 60 * 1000;
    sessionSearchStorage.Expiry = Date.now() + ttl;

    sessionStorage.setItem(
      'sessionSearch',
      JSON.stringify(sessionSearchStorage)
    );
    if (typeof $bc !== 'undefined' && $bc.setSource)
      $bc.setSource('cms.session');

    // --- TripGroup تمیز برای ارسال به سرویس‌های بعدی (حذف نام‌ها)
    let cleanTripGroup = sessionSearchStorage.tripGroup;
    if (Array.isArray(cleanTripGroup)) {
      cleanTripGroup = cleanTripGroup.map(
        ({ destinationName, originName, ...rest }) => rest
      );
    }

    // --- ست‌کردن سورس لیست
    if (typeof $bc !== 'undefined' && $bc.setSource) {
      $bc.setSource('cms.list', {
        type: 'upselling',
        TripGroup: JSON.stringify(cleanTripGroup || []),
        dmnid: sessionSearchStorage.dmnid || 0,
        Type: sessionSearchStorage.Type || '',
        lid: sessionSearchStorage.lid || 1,
        SessionId: sessionSearchStorage.SessionId || '',
        run: true,
        mode: MODE
      });
    }

        // Fetch provider data for client users
        if (getSearchCookie("rkey")) {
            const userResponse = await fetch('/Client_User_Type.inc');
            const user = await userResponse.text();
            if (user === "1") {
                const providerResponse = await fetch('/Client_Provider_Library.bc');
                providerDataList = await providerResponse.json();
            }
        }

const tripGroup = Array.isArray(sessionSearchStorage.tripGroup)
  ? sessionSearchStorage.tripGroup
  : [];

    console.log("testtttttttttttttttttt1111t::::",tripGroup);
    console.log("testttttttttttttttttttt::::",cleanTripGroup);

    // --- باکس «تلاش مجدد/Retry info» (Bus یک‌طرفه)
    const retryInfoContainer = document.querySelector(
      '.formbus .book-retry__info, .book-retry__info'
    );

    const createTripInfo = (title, trip) => {
      const tripDiv = document.createElement('div');
      tripDiv.classList.add('book-text-sm', 'book-mb-2');

      const fromTo = `${trip.originName} ${translate(
        'to_destination'
      )} ${trip.destinationName}`;
      const dateTxt = convertToPersianDate(trip.departureDate);

      tripDiv.innerHTML = `
        <div class="book-mb-2 book-text-zinc-800">${fromTo}</div>
        <div class="book-text-xs book-text-zinc-500">${title}: ${dateTxt}</div>
      `;
      return tripDiv;
    };

    if (retryInfoContainer) {
      retryInfoContainer.innerHTML = '';
      if (tripGroup.length >= 1) {
        retryInfoContainer.appendChild(
          createTripInfo('تاریخ', tripGroup[0])
        );
      }
    }

    // --- ست‌کردن فیلدهای فرم Bus (یک‌طرفه)
    if (tripGroup.length > 0) {
      const departureLocationName = document.querySelector(
        '.formbus .departure__location__name'
      );
      const arrivalLocationName = document.querySelector(
        '.formbus .arrival__location__name'
      );
      const departureDate = document.querySelector(
        '.formbus .departure__date'
      );
      const arrivalDateContainer = document.querySelector(
        '.formbus .arrival__date__container'
      ); // معمولا غیرفعاله

      const raw = tripGroup[0] || {};
      const trip = {
        originName:
          raw.originName ??
          raw.originCityName ??
          '',
        destinationName:
          raw.destinationName ??
          raw.destinationCityName ??
          '',
        departureDate:
          raw.departureDate ??
          raw.Date ??
          raw.GoDate ??
          '',
        origin:
          raw.origin ??
          raw.FromId ??
          raw.originCityId ??
          '',
        destination:
          raw.destination ??
          raw.ToId ??
          raw.destinationCityId ??
          ''
      };

      if (departureLocationName) {
        departureLocationName.value = trip.originName;
        departureLocationName.dataset.id = trip.origin;
      }
      if (arrivalLocationName) {
        arrivalLocationName.value = trip.destinationName;
        arrivalLocationName.dataset.id = trip.destination;
      }
      if (departureDate) {
        let dateformatted = convertToPersianDate(trip.departureDate);
        departureDate.value = dateformatted ;
        departureDate.dataset.date = trip.departureDate;
      }

      if (arrivalDateContainer)
        arrivalDateContainer.classList.add('disabled__date__container');
    }
  } catch (error) {
    console.error('setSessionBus: ' + error.message);
  }
}



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

    const prices = args.source.rows.slice(0, 30).map((row) => row.min_price);

    // This code is for the mobile version
    const unitFull = document
      .querySelectorAll(".book-currency")[0]
      ?.textContent?.trim();
    const unit = unitFull ? unitFull.charAt(0) : "";
    const now = new Date();

    const month = new Intl.DateTimeFormat("fa-IR", {
      calendar: "persian",
      month: "long",
    }).format(now);

    const year = new Intl.DateTimeFormat("fa-IR", {
      calendar: "persian",
      year: "numeric",
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
        day: "2-digit",
      })
        .format(date)
        .replace(/‏/g, "");

      // Extract weekday in Persian (e.g. "Saturday")
      // This code is for the mobile version
      const weekdayFull = new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        weekday: "long",
      }).format(date);
      const weekday = weekdayFull.charAt(0);

      // Extract month name in Persian (e.g. "Ordibehesht")
      const monthName = new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        month: "long",
      }).format(date);

      // Extract month number in Persian (e.g. "02")
      const monthNumber = new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        month: "2-digit",
      }).format(date);

      // Extract day of the month (e.g. "02")
      const day = new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        day: "2-digit",
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
        unit,
      });
    }

    if (args.context && typeof args.context.setAsSource === "function") {
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
    const sessionSearchData =
      JSON.parse(sessionStorage.getItem("sessionSearch")) || {};
    const cleanedData = { ...sessionSearchData };

    // Remove unnecessary fields
    delete cleanedData.Schemaid;
    delete cleanedData.Type;
    delete cleanedData.Expiry;

    if (cleanedData.TripGroup && Array.isArray(cleanedData.TripGroup)) {
      cleanedData.TripGroup.forEach((trip) => {
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

      const renderedContainers = document.querySelectorAll(
        ".book-rendered__container"
      );
      renderedContainers.forEach((e) => e.classList.remove("book-hidden"));

      const renderingContainer = document.querySelector(
        ".book-rendering__container"
      );
      if (renderingContainer) {
        renderingContainer.remove();
      }

      completeProgressBar();

      // Trigger calendar lookup if enabled
      const mainElement = document.querySelector("main");
      if (
        mainElement &&
        mainElement.getAttribute("data-calendarLookUp") === "true"
      ) {
        if (
          sessionSearchStorage &&
          sessionSearchStorage.TripGroup &&
          sessionSearchStorage.TripGroup[0]
        ) {
          const { Origin, Destination } = sessionSearchStorage.TripGroup[0];

          if (typeof $bc !== "undefined" && $bc.setSource) {
            $bc.setSource("cms.calendarLookUp", {
              origin: Origin,
              destination: Destination,
              run: true,
            });
          }
        }

        const priceSelectionContainer = document.querySelector(
          ".book-card__price__selection__container"
        );
        if (priceSelectionContainer) {
          priceSelectionContainer.classList.remove("book-hidden");
        }
      }
    } else {


      if (isMobile) {
  setTimeout(() => {
    initializePriceSlider();  // راه‌اندازی اسلایدر قیمت برای موبایل
  }, 200);
}

      // const mainContainer = document.querySelector(".book-main__container");
      // const noDataContainer = document.querySelector(".book-nodata__container");

      // if (mainContainer) {
      //     mainContainer.classList.add("book-hidden");
      // }
      // if (noDataContainer) {
      //     noDataContainer.classList.remove("book-hidden");
      // }

      document
        .querySelector(".book-main__container")
        .classList.add("book-hidden");
      document
        .querySelector(".book-nodata__container")
        .classList.remove("book-hidden");
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
let carrierNames = [];
let terminalNames = [];
let originTerminalNames = [];
let destinationTerminalNames = [];

let stopNames = [];
let busTypeNames = [];
let departureTimeNames = [];
let durationRange = [0, Infinity];
let maxDuration = 0;
let minDuration = 0;
let durationMinValueLabel = document.querySelector(
  ".book-duration__content .book-min__value"
);
let durationMaxValueLabel = document.querySelector(
  ".book-duration__content .book-max__value"
);

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
const outboundHourMinValueLabel = document.querySelector(
  ".book-outboundhour__content .book-filter__hour__container .book-min__value"
);
const outboundHourMaxValueLabel = document.querySelector(
  ".book-outboundhour__content .book-filter__hour__container .book-max__value"
);
let outboundMinHour = 0;
let outboundMaxHour = 0;
let outboundHourRange = [0, Infinity];

const inboundHourMinValueLabel = document.querySelector(
  ".book-inboundhour__content .book-filter__hour__container .book-min__value"
);
const inboundHourMaxValueLabel = document.querySelector(
  ".book-inboundhour__content .book-filter__hour__container .book-max__value"
);
let inboundMinHour = 0;
let inboundMaxHour = 0;
let inboundHourRange = [0, Infinity];

const hourMinValueLabel = document.querySelector(
  ".book-hour__content .book-filter__hour__container .book-min__value"
);
const hourMaxValueLabel = document.querySelector(
  ".book-hour__content .book-filter__hour__container .book-max__value"
);
let minHour = 0;
let maxHour = 0;
let hourRange = [0, Infinity];

// Additional filter and UI state
let systembusNames = [];
let fareFamilyNames = [];
let selectedBusId = null;
let dictionaries = [];
let BusProposalsSource = [];
let mustUpdate = true;
let newDataCame = false;
let InUpdateUIProcess = false;
let InUpdatePaging = true;
let InUpdateFiltering = true;
let allDataProcessed = false;

// Cached DOM elements for price slider
const priceSlider = document.querySelector(
  ".book-filter__price__container .book-slider__content"
);
const priceTrack = document.querySelector(
  ".book-filter__price__container .book-slider__track"
);
const priceThumbMin = document.querySelector(
  ".book-filter__price__container .book-thumb__min"
);
const priceThumbMax = document.querySelector(
  ".book-filter__price__container .book-thumb__max"
);
let priceMinValueLabel = document.querySelector(
  ".book-filter__price__container .book-min__value"
);
let priceMaxValueLabel = document.querySelector(
  ".book-filter__price__container .book-max__value"
);
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

let priceMinPercent = 0;  // تغییر از minPercent به priceMinPercent برای جلوگیری از تداخل
let priceMaxPercent = 100; // تغییر از maxPercent به priceMaxPercent
let isPriceSliderActive = false;
let currentPriceThumbType = null; // 'min' or 'max'



startProgressBar(1000);
const pagingContainer = document.querySelector(
  ".book-paging__cards__container"
);

const busManipulation = async (args) => {
  try {
    if (!args || !args.source) {
      console.error("busManipulation: Invalid arguments structure");
      return;
    }
    console.log("manipulation bus : ", args);

    globalListData = args;

    const isBusSearch =
      (args?.source?._id ?? args?.source?.id) === "bus.search";
    const rows = args?.source?._rows;

    if (isBusSearch && (!Array.isArray(rows) || rows.length === 0)) {
      // هیچ ردیفی نداریم
      document
        .querySelector(".book-main__container")
        .classList.add("book-hidden");
      document
        .querySelector(".book-nodata__container")
        .classList.remove("book-hidden");
    } else if (isBusSearch && Array.isArray(rows) && rows.length > 0) {
      // اگر هدفت این است که فقط وقتی «داده‌ی اتوبوس» داریم بخش اصلی نشان داده شود:
      const hasAnyBus = rows.some(
        (r) => Array.isArray(r.busProposals) && r.busProposals.length > 0
      );

      if (!hasAnyBus) {
        // document.querySelector(".book-main__container").classList.add("book-hidden");
        document
          .querySelector(".book-nodata__container")
          .classList.remove("book-hidden");
        return;
      }

      const existingBusIds = new Set(
        (globalBusProposals ?? []).map((bus) => bus.busId)
      );
      rows.forEach((row) => {
        if (Array.isArray(row.busProposals)) {
          const newBuses = row.busProposals.filter(
            (bus) => !existingBusIds.has(bus.busId)
          );
          (globalBusProposals ??= []).push(...newBuses);
          newBuses.forEach((bus) => existingBusIds.add(bus.busId));
        }
      });
    }

    // if (args.source.id === "bus.search" && !args.source._rows ) {
    //     document.querySelector(".book-main__container").classList.add("book-hidden");
    //     document.querySelector(".book-nodata__container").classList.remove("book-hidden");
    // } else if (args.source.id === "bus.search" && args.source._rows && Array.isArray(args.source._rows)) {
    //     const existingBusIds = new Set(globalBusProposals.map(bus => bus.busId));
    //     args.source._rows.forEach(row => {
    //         if (Array.isArray(row.busProposals)) {
    //             const newBuses = row.busProposals.filter(bus => !existingBusIds.has(bus.busId));
    //             globalBusProposals.push(...newBuses);
    //             newBuses.forEach(bus => existingBusIds.add(bus.busId));
    //         }
    //     });
    // }

    listData = args;
    let currentIndex = 0;
    let start = 0;
    let end = 30;
    let dynamicBusProposalsCount = 0;
    elseExecuted = false;
    startProgressBar();

    if (args.source.id === "cms.page") {
      mustUpdate = true;
      InUpdatePaging = false;
      InUpdateFiltering = false;
      selectedBusId = null;

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
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

      const newActive = pagingContainer.querySelector(
        `[bc-value="${currentValue}"]`
      );
      if (newActive) {
        newActive.classList.add("book-active__paging");
        newActive.classList.remove("bg-white");
      }

      start = currentValue * 30;
      end = start + 30;
      if (prevButton) {
        prevButton.classList.toggle("book-hidden", currentValue === 0);
      }
      const allButtons = Array.from(
        document.querySelectorAll(
          ".book-paging__container:not(.book-prevpage):not(.book-nextpage)"
        )
      );
      const lastButton = allButtons[allButtons.length - 1];
      if (nextButton) {
        nextButton.classList.toggle("book-hidden", newActive === lastButton);
      }
    } else if (args.source.id === "cms.nextpage") {
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
      const nextPage = document.querySelector(
        `.book-paging__cards__container [bc-value="${nextValue}"]`
      );

      if (nextPage) {
        activeButton.classList.remove("book-active__paging");
        activeButton.classList.add("bg-white");
        nextPage.classList.add("book-active__paging");
        nextPage.classList.remove("bg-white");

        if (nextPage.classList.contains("book-hidden")) {
          nextPage.classList.remove("book-hidden");
          const firstVisible = document.querySelector(
            ".book-paging__container:not(.hidden):not(.book-prevpage):not(.book-nextpage)"
          );
          if (firstVisible) firstVisible.classList.add("book-hidden");
        }

        if (prevButton) {
          prevButton.classList.toggle("book-hidden", nextValue === 0);
        }
      }

      const allButtons = Array.from(
        document.querySelectorAll(
          ".book-paging__container:not(.book-prevpage):not(.book-nextpage)"
        )
      );
      const lastButton = allButtons[allButtons.length - 1];
      if (nextButton) {
        nextButton.classList.toggle("book-hidden", nextPage === lastButton);
      }

      start = nextValue * 30;
      end = start + 30;
    } else if (args.source.id === "cms.prevpage") {
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
      const prevPage = document.querySelector(
        `.book-paging__cards__container [bc-value="${prevValue}"]`
      );

      if (prevPage) {
        activeButton.classList.remove("book-active__paging");
        activeButton.classList.add("bg-white");
        prevPage.classList.add("book-active__paging");
        prevPage.classList.remove("bg-white");

        if (prevPage.classList.contains("book-hidden")) {
          prevPage.classList.remove("book-hidden");
          const allButtons = Array.from(
            document.querySelectorAll(
              ".book-paging__container:not(.book-prevpage):not(.book-nextpage)"
            )
          );
          const lastVisible = allButtons
            .reverse()
            .find((btn) => !btn.classList.contains("book-hidden"));
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
    } else if (args.source.id === "cms.carrier") {
      InUpdateFiltering = false;
      InUpdatePaging = true;
      selectedBusId = null;
      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
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

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
        console.error(
          "busManipulation: Invalid source rows for cms.originterminal"
        );
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
      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
        console.error(
          "busManipulation: Invalid source rows for cms.destinationterminal"
        );
        return;
      }

      const value = args.source.rows[0].value;
      const index = destinationTerminalNames.indexOf(value);
      if (index !== -1) {
        destinationTerminalNames.splice(index, 1);
        toggleFilterCheckbox(
          ".book-destinationterminal__content",
          value,
          false
        );
      } else {
        destinationTerminalNames.push(value);
        toggleFilterCheckbox(".book-destinationterminal__content", value, true);
      }
    } else if (args.source.id === "cms.bustype") {
      InUpdateFiltering = false;
      InUpdatePaging = true;
      selectedBusId = null;

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
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
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item !== "");
        if (isMobile) {
          removeFilterDiv("bus-type");
          addFilterDiv("bus-type", "cms.bustype", busTypeValue);
        }
      }
    } else if (args.source.id === "cms.departuretime") {
      InUpdateFiltering = false;
      InUpdatePaging = true;
      const content = document.querySelector(".book-departuretime__content");
      if (!content) return;

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
        console.error(
          "busManipulation: Invalid source rows for cms.departuretime"
        );
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
        const existingElement = content.querySelector(
          `.book-time__content[data-value="${value}"]`
        );
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
        const existingTimeContents = content.querySelectorAll(
          ".book-time__content"
        );

        if (
          existingTimeContents.length === 1 &&
          departureTimeNames.length === 1
        ) {
          const defaultTimeContent = existingTimeContents[0];
          defaultTimeContent.setAttribute("data-value", value);
          defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ساعت از: <span class="book-hour">${timeRange}</span>
                    </div>
                `;
        } else {
          const duplicateElement = content.querySelector(
            `.book-time__content[data-value="${value}"]`
          );
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
        selectedFlightId = null;

        if (!priceSlider) {
            return;
        }

        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }

        cleanupPriceSliderEvents();

        // ===== Desktop Mouse Events =====
        if (!isMobile) {
            setupDesktopPriceSlider(args.source.rows[0].value);
        }
        // ===== Mobile Touch Events =====
        else {
            setupMobilePriceSlider(args.source.rows[0].value);
        }





    } else if (args.source.id === "cms.price.update") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        mustUpdate = true;
    } else if (args.source.id === "cms.duration") {
      InUpdateFiltering = false;
      InUpdatePaging = true;
      selectedBusId = null;
      const durationContainer = document.querySelector(
        ".book-duration__content .book-filter__duration__container"
      );

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
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
        "duration",
        "duration-range"
      );
    } else if (args.source.id === "cms.sort") {
      InUpdateFiltering = false;
      InUpdatePaging = true;
      selectedBusId = null;
      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
        console.error("busManipulation: Invalid source rows for cms.sort");
        return;
      }

      const sortValue = args.source.rows[0].value;
      const sortItem = document.querySelector(`[bc-value="${sortValue}"]`);

      if (!sortItem) {
        console.error("busManipulation: Sort item not found");
        return;
      }

      const sortOrder = sortItem.getAttribute("data-sort");
      const listItems = document.querySelectorAll(
        ".book-sort__cards__container .book-sort__item__content"
      );
      listItems.forEach((item) => {
        if (item.getAttribute("data-sort")) {
          item.setAttribute("data-sort", "descend");
        }
        const svg = item.querySelector("svg");
        if (svg) {
          svg.innerHTML =
            '<use xlink:href="/booking/images/sprite-booking-icons.svg#sort-up-icon"></use>';
        }
        item.classList.remove("book-sorting__active");
      });

      if (sortValue === "default") {
        currentSort = { value: "default", order: "" };
      } else {
        const newOrder = sortOrder === "ascend" ? "descend" : "ascend";
        sortItem.setAttribute("data-sort", newOrder);
        sortItem.classList.add("book-sorting__active");
        toggleSvg(sortItem.querySelector("svg"), newOrder === "ascend");
        currentSort = { value: sortValue, order: newOrder };
      }
      mustUpdate = true;
    } else if (args.source.id === "cms.bus") {
      InUpdateFiltering = false;
      InUpdatePaging = true;

      if (
        !args.source.rows ||
        !Array.isArray(args.source.rows) ||
        args.source.rows.length === 0
      ) {
        console.error("busManipulation: Invalid source rows for cms.bus");
        return;
      }

      selectedBusId = args.source.rows[0].value;
    } else if (args.source.id === "bus.search") {
      newDataCame = true;
      allDataProcessed = false;
    }

    if (mustUpdate && !InUpdateUIProcess) {
      InUpdateUIProcess = true;

      if (newDataCame) {
        let source;
        if (args.context && typeof args.context.tryToGetSource === "function") {
          source = args.context.tryToGetSource("bus.search");
        } else {
          console.error(
            "busManipulation: context.tryToGetSource is not available"
          );
          InUpdateUIProcess = false;
          return;
        }

        if (!source || !source.rows || !Array.isArray(source.rows)) {
          console.error("busManipulation: Invalid bus.search source");
          InUpdateUIProcess = false;
          return;
        }

        if (source.rows[0]?.isNewSearch) {
          allBusProposals = [];
          globalBusProposals = [];
          dictionaries = [];
        }

        const existingBusIds = new Set(allBusProposals.map((bus) => bus.busId));
        source.rows.forEach((row) => {
          if (Array.isArray(row.busProposals)) {
            const newBuses = row.busProposals.filter(
              (bus) => !existingBusIds.has(bus.busId)
            );
            allBusProposals.push(...newBuses);
            originalBusProposals = [...allBusProposals];
            newBuses.forEach((bus) => existingBusIds.add(bus.busId));
          }
        });

        if (source.rows[source.rows.length - 1]?.dictionaries) {
          dictionaries.push(source.rows[source.rows.length - 1].dictionaries);
        }
        newDataCame = false;
        allDataProcessed = true;
      }

      if (allDataProcessed) {
        if (currentSort.value === "default") {
          allBusProposals = [...originalBusProposals];
        } else {
          allBusProposals.sort((a, b) => {
            let fieldA, fieldB;
            if (currentSort.value === "price") {
              fieldA = a.priceInfo?.totalCommission
                ? parseFloat(a.priceInfo.totalCommission)
                : Infinity;
              fieldB = b.priceInfo?.totalCommission
                ? parseFloat(b.priceInfo.totalCommission)
                : Infinity;
            } else if (currentSort.value === "hour") {
              fieldA = convertToMinutes(a.busGroup?.[0]?.departureTime || "");
              fieldB = convertToMinutes(b.busGroup?.[0]?.departureTime || "");
            } else if (currentSort.value === "departure") {
              fieldA = convertToMinutes(a.busGroup?.[0]?.departureTime || "");
              fieldB = convertToMinutes(b.busGroup?.[0]?.departureTime || "");
            }

            if (fieldA !== undefined && fieldB !== undefined) {
              return currentSort.order === "ascend"
                ? fieldA - fieldB
                : fieldB - fieldA;
            }
            return 0;
          });
        }
      }

      const filters = [
        (item) =>
          !carrierNames.length ||
          item.busGroup.some(
            (bus) =>
              bus.routesInfo &&
              bus.routesInfo.some((route) =>
                carrierNames.includes(route.busOperatorCode)
              )
          ),

        (item) =>
          !originTerminalNames.length ||
          item.busGroup.some((bus) =>
            originTerminalNames.includes(bus.originTerminal)
          ),

        (item) =>
          !destinationTerminalNames.length ||
          item.busGroup.some((bus) =>
            destinationTerminalNames.includes(bus.destinationTerminal)
          ),

        (item) =>
          !stopNames.length ||
          item.busGroup.some((bus) =>
            stopNames.includes(parseInt(bus.numberOfStops))
          ),

        (item) =>
          !busTypeNames.length ||
          busTypeNames.every((bt) =>
            item.busGroup.some(
              (bus) =>
                bus.routesInfo &&
                bus.routesInfo.some((route) =>
                  route.busType?.toLowerCase().includes(bt)
                )
            )
          ),

        (item) => {
          if (!departureTimeNames.length) return true;
          return item.busGroup.some((bus) => {
            const [hour, minute] =
              bus.departureTime?.split(":")?.map(Number) || [];
            if (hour == null || minute == null) return false;
            return departureTimeNames.some((range) => {
              const [start, end] = range.split("-").map(Number);
              return hour >= start && hour <= end;
            });
          });
        },

        (item) => {
          return item.busGroup.some((bus) => {
            const duration = bus.duration;
            if (!duration) return true;
            const durationInMinutes = convertToMinutes(duration);
            return (
              durationInMinutes >= durationRange[0] &&
              durationInMinutes <= durationRange[1]
            );
          });
        },

        (item) => {
          const price = item.priceInfo?.totalCommission
            ? parseFloat(item.priceInfo.totalCommission)
            : Infinity;
          return price >= priceRange[0] && price <= priceRange[1];
        },
      ];

      const newSource = allBusProposals.filter((item) =>
        filters.every((filter) => filter(item))
      );

      dynamicBusProposalsCount = newSource.length;
      const countElement = document.querySelector(".book-count__api__content");
      if (countElement) {
        countElement.textContent = dynamicBusProposalsCount;
      }

      const locationDict = dictionaries[0]?.location || {};
      const carrierDict = dictionaries[0]?.carriers || {};
      const currencyDict = dictionaries[0]?.currency || {};
      const indexedSource = newSource.map((item, i) => {
        const busGroup = item.busGroup?.[0] || {};
        const routeInfo = busGroup.routesInfo?.[0] || {};
        const price = item.priceInfo?.total || 0;
        const totalCommission = item.priceInfo?.totalCommission || 0;
        const currencyCode = item.priceInfo?.currency || "";
        const originId = busGroup.origin;
        const destinationId = busGroup.destination;
        const carrierCode = routeInfo.busOperatorCode;
        return {
          ...item,
          SelectedBus: item.busId === selectedBusId,
          index: currentIndex + i,

          rowNumber: i + 1,

          origin: originId,
          originTerminal: busGroup.originTerminal || "",
          originCity: locationDict[originId]?.city || "",
          originCountry: locationDict[originId]?.country || "",

          destination: destinationId,
          destinationTerminal: busGroup.destinationTerminal || "",
          destinationCity: locationDict[destinationId]?.city || "",
          destinationCountry: locationDict[destinationId]?.country || "",

          departureDate: busGroup.departureDate || "",
          departureTime: busGroup.departureTime || "",
          arrivalDate: busGroup.arrivalDate || "",
          arrivalTime: busGroup.arrivalTime || "",
          duration: busGroup.duration || "",

          busType: routeInfo.busType || "",
          numberOfStops: busGroup.numberOfStops || 0,
          availableSeats: busGroup.availableSeats || 0,

          refundable: busGroup.refundable || false,
          refundableText: busGroup.refundable ? "بله" : "خیر",

          baseFare: item.priceInfo?.baseFare || 0,
          tax: item.priceInfo?.tax || 0,
          providerFare: item.priceInfo?.providerFare || 0,
          price: price,
          totalCommission: totalCommission,
          formattedPriceCard: price,
          formattedPrice: formatPrice(price, currencyDict[currencyCode] || ""),
          formattedTotalCommission: formatPrice(
            totalCommission,
            currencyDict[currencyCode] || ""
          ),
          currency: currencyDict[currencyCode] || "",
          currencyCode: currencyCode,

          carrierCode: carrierCode,
          carrierName: carrierDict[carrierCode]?.name || "",
          carrierImage: carrierDict[carrierCode]?.image || "",

          providerId: item.Provider?.ProviderId || "",
          dmnid: item.Provider?.Dmnid || "",

          description: busGroup.description || "",

          segmentId: routeInfo.SegmentId || 1,
          originRoute: routeInfo.originRoute || originId,
          destinationRoute: routeInfo.destinationRoute || destinationId,
        };
      });

      currentIndex += newSource.length;
      const selectedIndex = indexedSource.findIndex((item) => item.SelectedBus);
      if (selectedIndex !== -1) {
        const page = Math.floor(selectedIndex / 30);
        start = page * 30;
        end = start + 30;
        setTimeout(() => {
          const targetElement = document.getElementById(
            `bus__${selectedIndex}`
          );
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 100);
      }
      const pagedSource = indexedSource.slice(start, end);
      BusProposalsSource = pagedSource;
      if (pagedSource.length > 0) {
        const pricesSource = allBusProposals
          .map((item) =>
            item.priceInfo?.totalCommission
              ? parseFloat(item.priceInfo.totalCommission)
              : null
          )
          .filter(Boolean);

        const shouldUpdateMinMax =
          newDataCame || (minPrice === 0 && maxPrice === 0);

        if (shouldUpdateMinMax) {
          minPrice = pricesSource.length ? Math.min(...pricesSource) : 0;
          maxPrice = pricesSource.length ? Math.max(...pricesSource) : 0;

          if (
            minPercent === 0 &&
            maxPercent === 100 &&
            priceRange[0] === 0 &&
            priceRange[1] === Infinity
          ) {
            priceRange = [minPrice, maxPrice];
          }
        }

        const currentMinPrice = priceRange[0] || minPrice;
        const currentMaxPrice = priceRange[1] || maxPrice;

        if (priceMaxValueLabel) {
          const displayMaxPrice = userHasChangedPriceRange
            ? lastUserMaxPrice
            : maxPrice;
          priceMaxValueLabel.textContent = new Intl.NumberFormat().format(
            displayMaxPrice
          );
        }
        if (priceMinValueLabel) {
          const displayMinPrice = userHasChangedPriceRange
            ? lastUserMinPrice
            : minPrice;
          priceMinValueLabel.textContent = new Intl.NumberFormat().format(
            displayMinPrice
          );
        }

        if (InUpdatePaging) {
          const container = document.querySelector(
            ".book-paging__cards__container"
          );
          if (container) {
            const nextPage = container.querySelector(".book-nextpage");
            const prevPage = container.querySelector(".book-prevpage");

            if (prevPage) {
              prevPage.classList.add("book-hidden");
            }

            const roundedNumber = Math.ceil(currentIndex / 30);
            const activePage =
              selectedIndex !== -1 ? Math.floor(selectedIndex / 30) : 0;
            const maxVisiblePages = 5;
            const startPage = Math.max(
              0,
              activePage - Math.floor(maxVisiblePages / 2)
            );
            const endPage = Math.min(
              roundedNumber,
              startPage + maxVisiblePages
            );
            const adjustedStartPage =
              endPage - startPage < maxVisiblePages
                ? Math.max(0, endPage - maxVisiblePages)
                : startPage;

            const arrayPaging = Array.from(
              { length: roundedNumber },
              (_, i) => ({
                index: i,
                page: i + 1,
                isActive: i === activePage,
                isVisible: i >= adjustedStartPage && i < endPage,
              })
            );

            if (nextPage) {
              nextPage.classList.toggle("book-hidden", arrayPaging.length <= 1);
            }

            if (
              args.context &&
              typeof args.context.setAsSource === "function"
            ) {
              args.context.setAsSource("bus.paging", arrayPaging);
            }
          }
        }

        if (InUpdateFiltering) {
          const filteringSource = allBusProposals;

          const mergedCarriers = {};
          const mergedCurrency = {};
          const mergedLocation = {};
          dictionaries.forEach((item) => {
            Object.assign(mergedCarriers, item.carriers || {});
            Object.assign(mergedCurrency, item.currency || {});
            Object.assign(mergedLocation, item.location || {});
          });

          let allCarrierItems = [];

          filteringSource.forEach((item) => {
            const carrierItems = (item.busGroup || [])
              .flatMap((bus) =>
                (bus.routesInfo || []).map((value) => ({
                  Name: mergedCarriers[value.busOperatorCode]?.name || "",
                  Logo: mergedCarriers[value.busOperatorCode]?.image || "",
                  Code: value.busOperatorCode || "",
                  NumberOfStops: bus.numberOfStops || 0,
                  BusId: item.busId || "",
                  Price: item.priceInfo?.total
                    ? parseFloat(item.priceInfo.total)
                    : Infinity,
                  Unit: mergedCurrency[item.priceInfo?.currency] || "",
                }))
              )
              .filter(
                (item) => item.Name && item.Code && item.Price !== Infinity
              );

            allCarrierItems.push(...carrierItems);
          });

          const nameToMinPrice = {};
          allCarrierItems.forEach((item) => {
            if (
              !nameToMinPrice[item.Name] ||
              nameToMinPrice[item.Name].Price > item.Price
            ) {
              nameToMinPrice[item.Name] = item;
            }
          });
          const carrierListResult = Object.values(nameToMinPrice).sort(
            (a, b) => a.Price - b.Price
          );

          if (args.context && typeof args.context.setAsSource === "function") {
            args.context.setAsSource("bus.carriers", carrierListResult);
          }

          const uniqueOriginTerminals = filteringSource
            .flatMap((item) =>
              (item.busGroup || []).map((bus) => ({
                Name: bus.originTerminal || "",
                Code: bus.originTerminal || "",
              }))
            )
            .filter((item) => item.Name && item.Code);

          const originTerminalListResult = uniqueOriginTerminals.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.Name === item.Name)
          );

          if (args.context && typeof args.context.setAsSource === "function") {
            args.context.setAsSource(
              "bus.originterminals",
              originTerminalListResult
            );
          }

          const uniqueDestinationTerminals = filteringSource
            .flatMap((item) =>
              (item.busGroup || []).map((bus) => ({
                Name: bus.destinationTerminal || "",
                Code: bus.destinationTerminal || "",
              }))
            )
            .filter((item) => item.Name && item.Code);

          const destinationTerminalListResult =
            uniqueDestinationTerminals.filter(
              (item, index, self) =>
                index === self.findIndex((t) => t.Name === item.Name)
            );

          if (args.context && typeof args.context.setAsSource === "function") {
            args.context.setAsSource(
              "bus.destinationterminals",
              destinationTerminalListResult
            );
          }

          const uniqueStop = filteringSource
            .flatMap((item) =>
              (item.busGroup || []).map((bus) => ({ Name: bus.numberOfStops }))
            )
            .filter((item) => item.Name != null);

          const stopListResult = uniqueStop.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.Name === item.Name)
          );

          if (args.context && typeof args.context.setAsSource === "function") {
            args.context.setAsSource("bus.stops", stopListResult);
          }

          const uniqueBusTypes = filteringSource
            .flatMap((item) =>
              (item.busGroup || []).flatMap((bus) =>
                (bus.routesInfo || []).map((route) => ({
                  Name: route.busType || "",
                  Code: route.busType || "",
                }))
              )
            )
            .filter((item) => item.Name && item.Code);

          const busTypeListResult = uniqueBusTypes.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.Name === item.Name)
          );

          if (args.context && typeof args.context.setAsSource === "function") {
            args.context.setAsSource("bus.bustypes", busTypeListResult);
          }

          const durationsSource = allBusProposals
            .map((item) => item.busGroup?.[0]?.duration)
            .filter(Boolean);

          if (durationsSource.length > 0) {
            const uniqueDurationsSource = [...new Set(durationsSource)];
            const timesInMinutes = uniqueDurationsSource.map(convertToMinutes);
            minDuration = timesInMinutes.length
              ? Math.min(...timesInMinutes)
              : 0;
            maxDuration = timesInMinutes.length
              ? Math.max(...timesInMinutes)
              : 0;

            if (durationMaxValueLabel) {
              durationMaxValueLabel.textContent = convertToTime(maxDuration);
            }
            if (durationMinValueLabel) {
              durationMinValueLabel.textContent = convertToTime(minDuration);
            }
          }
        }

        if (args.context && typeof args.context.setAsSource === "function") {
          console.log("bus.updated" , args.context );
          args.context.setAsSource("bus.updated", pagedSource, {
            keyFieldName: "busId",
          });
        }
        setTimeout(() => {
          preservePriceLabels();
        }, 10);

        InUpdateUIProcess = false;
      } else {
        InUpdateUIProcess = false;
        const listContainer = document.querySelector(
          ".book-list__cards__container"
        );
        if (listContainer) {
          listContainer.innerHTML = `
                    <div class="book-text-center">
                        <div>هیچ اتوبوسی مطابق با فیلترهای شما وجود ندارد.</div>
                        <div class="book-text-zinc-900 book-text-xs book-mt-2">برای مشاهده نتایج، فیلترهای خود را پاک کنید.</div>
                    </div>
                `;
        }

        const container = document.querySelector(
          ".book-paging__cards__container"
        );
        if (container) {
          const buttons = container.querySelectorAll(
            ".book-paging__container:not(.book-nextpage):not(.book-prevpage)"
          );
          const nextPage = container.querySelector(".book-nextpage");
          const prevPage = container.querySelector(".book-prevpage");

          if (prevPage) prevPage.classList.add("book-hidden");
          if (nextPage) nextPage.classList.add("book-hidden");
          buttons.forEach((button) => button.remove());
        }
      }
    }

    endProgressBar();
  } catch (error) {
    console.error("busManipulation: " + error.message);
    InUpdateUIProcess = false;
    endProgressBar();
  }
};




const renderPaging = async (element) => {
  try {
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
    return `<button class="book-paging__container book-leading-9 book-border book-border-solid book-border-zinc-200 book-rounded-lg book-w-8 book-h-8${
      isActive ? " book-active__paging" : " book-bg-white"
    } ${
      isVisible ? "" : " book-hidden"
    }" type="button" bc-value="${index}" bc-name="cms.page" bc-triggers="click">${page}</button>`;
  } catch (error) {
    console.error(`renderPaging: ${error.message}`);
    return "";
  }
};

function convertToMinutes(timeString) {
  if (!timeString || typeof timeString !== "string") return 0;
  const parts = timeString.split(":");
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  return hours * 60 + minutes;
}

function convertToTime(minutes) {
  if (typeof minutes !== "number" || minutes < 0) return "00:00";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function formatPrice(price, currency) {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  if (typeof numericPrice !== "number" || isNaN(numericPrice)) {
    console.warn("formatPrice: Invalid price value:", price);
    return "0";
  }

  const formattedNumber = new Intl.NumberFormat("fa-IR").format(numericPrice);

  const currencyUnit = currency || "ریال";
  return `${formattedNumber} ${currencyUnit}`;
}

const toggleFilterCheckbox = (
  selector,
  value,
  isChecked,
  itemSelector = ".book-filter__item"
) => {
  try {
    const part = selector.match(/\.book-([a-zA-Z0-9_-]+?)__/)[1];
    const element = document
      .querySelector(selector)
      ?.querySelector(`[bc-value="${value}"]`);
    const target = itemSelector ? element?.closest(itemSelector) : element;
    const isSpecialCase = selector.includes("book-departuretime__content");

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
          addFilterDiv(value, `cms.${part}`, "", element.dataset.textshow);
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
          addFilterDiv(value, `cms.${part}`, "", element?.dataset.textshow);
        } else {
          removeFilterDiv(value);
        }
      }
    }
  } catch (error) {
    console.error("toggleFilterCheckbox: " + error.message);
  }
};

function initializeSlider(
  container,
  sliderType,
  maxValue,
  minValue,
  minLabel,
  maxLabel,
  range,
  rangeId,
  rangeClass
) {
  try {
    if (!container) return;
  } catch (error) {
    console.error("initializeSlider: " + error.message);
  }
}

function toggleSvg(svgElement, isAscending) {
  try {
    if (!svgElement) return;

    const iconName = isAscending ? "sort-up-icon" : "sort-down-icon";
    svgElement.innerHTML = `<use xlink:href="/booking/images/sprite-booking-icons.svg#${iconName}"></use>`;
  } catch (error) {
    console.error("toggleSvg: " + error.message);
  }
}

function endProgressBar() {
  try {
    const progressBarElement = document.querySelector(".book-progress-bar");
    if (progressBarElement) {
      progressBarElement.style.display = "none";
    }
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  } catch (error) {
    console.error("endProgressBar: " + error.message);
  }
}

// price

const updatePriceSlider = () => {
  try {
    const totalRange = maxPrice - minPrice;
    const priceMinValue = Math.round(
      (minPercent / 100) * totalRange + minPrice
    );
    const priceMaxValue = Math.round(
      (maxPercent / 100) * totalRange + minPrice
    );

    priceRange = [priceMinValue, priceMaxValue];

    if (priceMinValueLabel) {
      priceMinValueLabel.textContent = new Intl.NumberFormat().format(
        priceMinValue
      );
    }
    if (priceMaxValueLabel) {
      priceMaxValueLabel.textContent = new Intl.NumberFormat().format(
        priceMaxValue
      );
    }

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

    if (typeof updateFilterDisplay === "function") {
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
  } catch (error) {
    console.error(`updatePriceSlider: ${error.message}`);
  }
};

const preservePriceLabels = () => {
  try {
    const totalRange = maxPrice - minPrice;
    const currentMinPrice = Math.round(
      (minPercent / 100) * totalRange + minPrice
    );
    const currentMaxPrice = Math.round(
      (maxPercent / 100) * totalRange + minPrice
    );

    if (priceMinValueLabel) {
      priceMinValueLabel.textContent = new Intl.NumberFormat().format(
        currentMinPrice
      );
    }
    if (priceMaxValueLabel) {
      priceMaxValueLabel.textContent = new Intl.NumberFormat().format(
        currentMaxPrice
      );
    }
  } catch (error) {
    console.error("preservePriceLabels: " + error.message);
  }
};

function triggerPriceFilter() {
  try {
    mustUpdate = true;
    if (typeof $bc !== "undefined" && $bc.setSource) {
      $bc.setSource("cms.price", {
        value: "range",
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        run: true
      });
    } else {
      console.log("tttttttttttttttttttttttttttttttttttttttttttttttttt")
      busManipulation({
        source: {
          id: "cms.price.update",
          rows: [
            {
              value: "range",
              minPrice: priceRange[0],
              maxPrice: priceRange[1],
            },
          ],
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
          },
        },
      });
    }
  } catch (error) {
    console.error("triggerPriceFilter: " + error.message);
  }
}


function handlePriceDrag(args) {
  try {
    if (
      !args.source.rows ||
      !Array.isArray(args.source.rows) ||
      args.source.rows.length === 0
    ) {
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

      const x = Math.min(
        Math.max(e.clientX - sliderRect.left, 0),
        sliderRect.width
      );
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

      document.removeEventListener("mousemove", currentMouseMoveHandler);
      thumbElement.removeEventListener("mouseup", currentMouseUpHandler);

      userHasChangedPriceRange = true;
      lastUserMinPrice = priceRange[0];
      lastUserMaxPrice = priceRange[1];

      clearTimeout(window.priceFilterTimeout);
      window.priceFilterTimeout = setTimeout(() => {
        triggerPriceFilter();
      }, 150);
    };

    document.addEventListener("mousemove", currentMouseMoveHandler, {
      passive: true,
    });
    thumbElement.addEventListener("mouseup", currentMouseUpHandler, {
      once: true,
    });
  } catch (error) {
    console.error("handlePriceDrag: " + error.message);
    cleanupSliderEvents();
  }
}


const updateFilterDisplay = (type, label, minValue, maxValue, originalMin, originalMax, hourContainer = null, hourRange = null) => {
    try {
        if (isMobile) {
            removeFilterDiv(label);
        };

        if (minValue !== originalMin || maxValue !== originalMax) {
            let displayValue;
            let filterLabel;

            if (type === "price") {
                const formattedMin = new Intl.NumberFormat().format(minValue);
                const formattedMax = new Intl.NumberFormat().format(maxValue);
                displayValue = `${formattedMin} - ${formattedMax}`;
                filterLabel = `${translate("price") || "قیمت"}: ${displayValue}`;
                if (isMobile) {
                    addFilterDiv(label, `cms.${type}`, filterLabel, null, {
                        originalMin,
                        originalMax,
                        hourContainer,
                        hourRange
                    });
                }

            } else if (type === "outboundhour" || type === "inboundhour" || type === "hour") {
                const formatTime = (minutes) => {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    return `${hours} ${translate("hour")} ${mins} ${translate("minute")}`;
                };
                const formattedMin = formatTime(minValue);
                const formattedMax = formatTime(maxValue);
                displayValue = `${formattedMin} - ${formattedMax}`;
                filterLabel =
                    type === "outboundhour" ? `${translate("outbound_time") || "ساعت رفت"}: ${displayValue}` :
                        type === "inboundhour" ? `${translate("return_time") || "ساعت برگشت"}: ${displayValue}` :
                            `${translate("time") || "ساعت"}: ${displayValue}`;
                if (isMobile) {
                    addFilterDiv(label, `cms.${type}`, filterLabel, null, {
                        originalMin,
                        originalMax,
                        hourContainer,
                        hourRange
                    });
                }
            }
        }
    } catch (error) {
        console.error(`updateFilterDisplay: ${error.message}`);
    }
};



function initializePriceSlider() {
  try {
    if (priceSliderInitialized || !priceSlider) return;
    priceSliderInitialized = true;

    console.log("ooooooooooooooooooooooooooooooo")
    setupPriceSliderEvents(priceThumbMin, priceThumbMax);
  } catch (error) {
    console.error("initializePriceSlider:", error.message);
  }
}


function setupPriceSliderEvents(thumbMin, thumbMax) {
  try {
    // Pointer events for both desktop and mobile (cross-browser)
    thumbMin.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cleanupPriceSliderEvents();
      setupUnifiedPriceSlider('min');
    }, { passive: false });

    thumbMax.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cleanupPriceSliderEvents();
      setupUnifiedPriceSlider('max');
    }, { passive: false });
  } catch (error) {
    console.error("setupPriceSliderEvents:", error.message);
  }
}



function setupDesktopPriceSlider(thumbType) {
  try {
    if (!priceSlider) {
      console.warn("Price slider not found");
      return;
    }

    isPriceSliderActive = true;
    currentPriceThumbType = thumbType;

    const onMouseMove = (e) => {
      if (!isPriceSliderActive) return;

      const rect = priceSlider.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const percent = (x / rect.width) * 100;

      if (thumbType === "min") {
        if (percent <= priceMaxPercent) {
          priceMinPercent = percent;
          updatePriceSliderUI();
        }
      } else if (thumbType === "max") {
        if (percent >= priceMinPercent) {
          priceMaxPercent = percent;
          updatePriceSliderUI();
        }
      }
    };

    const onMouseUp = () => {
      if (!isPriceSliderActive) return;

      isPriceSliderActive = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      applyPriceFilterImmediate();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  } catch (error) {
    console.error("setupDesktopPriceSlider:", error.message);
  }
}


function setupMobilePriceSlider(thumbType) {
  try {
    if (!priceSlider) {
      console.warn("Price slider not found");
      return;
    }

    isPriceSliderActive = true;
    currentPriceThumbType = thumbType;

    const getTouchX = (e) => {
      const touch = e.touches[0] || e.changedTouches[0];
      return touch ? touch.clientX : 0;
    };

    const onTouchMove = (e) => {
      if (!isPriceSliderActive) return;
      e.preventDefault();

      const rect = priceSlider.getBoundingClientRect();
      const x = Math.max(0, Math.min(getTouchX(e) - rect.left, rect.width));
      const percent = (x / rect.width) * 100;

      if (thumbType === "min") {
        if (percent <= priceMaxPercent) {
          priceMinPercent = percent;
          updatePriceSliderUI();
        }
      } else if (thumbType === "max") {
        if (percent >= priceMinPercent) {
          priceMaxPercent = percent;
          updatePriceSliderUI();
        }
      }
    };

    const onTouchEnd = () => {
      if (!isPriceSliderActive) return;

      isPriceSliderActive = false;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);

      applyPriceFilterImmediate();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    document.addEventListener("touchcancel", onTouchEnd, { passive: false });
  } catch (error) {
    console.error("setupMobilePriceSlider:", error.message);
  }
}



function updatePriceSliderUI() {
  try {
    if (!priceSlider) return;

    const totalRange = maxPrice - minPrice;
    const minValue = Math.round(minPrice + (priceMinPercent / 100) * totalRange);
    const maxValue = Math.round(minPrice + (priceMaxPercent / 100) * totalRange);

    // Update range
    priceRange[0] = minValue;
    priceRange[1] = maxValue;

    // Update labels
    if (priceMinValueLabel) {
      priceMinValueLabel.textContent = `${minValue.toLocaleString()} ${currency}`;
    }
    if (priceMaxValueLabel) {
      priceMaxValueLabel.textContent = `${maxValue.toLocaleString()} ${currency}`;
    }

    // Update slider visual
    if (priceThumbMin) {
      priceThumbMin.style.left = `${priceMinPercent}%`;
    }
    if (priceThumbMax) {
      priceThumbMax.style.left = `${priceMaxPercent}%`;
    }
    if (priceTrack) {
      priceTrack.style.left = `${priceMinPercent}%`;
      priceTrack.style.right = `${100 - priceMaxPercent}%`;
    }
  } catch (error) {
    console.error("updatePriceSliderUI:", error.message);
  }
}

function applyPriceFilterImmediate() {
  try {
    mustUpdate = true;

    if (typeof $bc !== 'undefined' && $bc.setSource) {
      $bc.setSource("cms.price", {
        value: "range",
        min: priceRange[0],
        max: priceRange[1],
        run: true
      });
    }

    // Update filter display for mobile (if needed)
    if (isMobile) {
      updateFilterDisplay(
        "price",
        "price-range",
        priceRange[0],
        priceRange[1],
        minPrice,
        maxPrice,
        null,
        priceRange
      );
    }
  } catch (error) {
    console.error("applyPriceFilterImmediate:", error.message);
  }
}


// اول، تابع debounce را اضافه کنید (اگر وجود ندارد)
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
let updateLock = false;
// حالا، applyPriceFilterImmediate را به صورت debounced تعریف کنید
const debouncedApplyPriceFilter = debounce(() => {
    if (updateLock) return;  // اگر lock باشه، skip کن
    updateLock = true;       // lock رو set کن

    mustUpdate = true;
    if (typeof $bc !== 'undefined' && $bc.setSource) {
        $bc.setSource("cms.price", {
            value: "range",
            min: priceRange[0],
            max: priceRange[1],
            run: true
        });
    }
    // اگر موبایل است، display رو update کنید
    if (isMobile) {
        updateFilterDisplay(
            "price",
            "price-range",
            priceRange[0],
            priceRange[1],
            minPrice,
            maxPrice,
            null,
            priceRange
        );
    }

    // بعد از 200ms، lock رو reset کن (برای جلوگیری از flood)
    setTimeout(() => { updateLock = false; }, 200);
}, 150);

let currentOnPointerMove = null;
let currentOnPointerUp = null;

function cleanupPriceSliderEvents() {
    isPriceSliderActive = false;
    if (currentOnPointerMove) {
        document.removeEventListener("pointermove", currentOnPointerMove, { passive: false });
        currentOnPointerMove = null;
    }
    if (currentOnPointerUp) {
        document.removeEventListener("pointerup", currentOnPointerUp, { passive: false });
        document.removeEventListener("pointercancel", currentOnPointerUp, { passive: false });
        currentOnPointerUp = null;
    }
    updateLock = false;  // reset lock در cleanup
}

// setupUnifiedPriceSlider
function setupUnifiedPriceSlider(thumbType) {
    try {
        if (!priceSlider) {
            console.warn("Price slider not found");
            return;
        }

        cleanupPriceSliderEvents();  // همیشه اول cleanup

        isPriceSliderActive = true;
        currentPriceThumbType = thumbType;

        currentOnPointerMove = (e) => {
            if (!isPriceSliderActive || updateLock) return;  // اگر lock باشه، skip
            e.preventDefault();
            e.stopPropagation();  // جلوگیری از bubbling که ممکنه trigger کنه

            const rect = priceSlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percent = (x / rect.width) * 100;

            if (thumbType === "min") {
                if (percent <= priceMaxPercent) {
                    priceMinPercent = percent;
                    updatePriceSliderUI();
                }
            } else if (thumbType === "max") {
                if (percent >= priceMinPercent) {
                    priceMaxPercent = percent;
                    updatePriceSliderUI();
                }
            }
        };

        currentOnPointerUp = (e) => {
            if (!isPriceSliderActive) return;
            e.stopPropagation();  // stop bubbling

            isPriceSliderActive = false;
            cleanupPriceSliderEvents();

            debouncedApplyPriceFilter();
        };

        document.addEventListener("pointermove", currentOnPointerMove, { passive: false });
        document.addEventListener("pointerup", currentOnPointerUp, { passive: false });
        document.addEventListener("pointercancel", currentOnPointerUp, { passive: false });

        window.addEventListener('blur', cleanupPriceSliderEvents, { once: true });

    } catch (error) {
        console.error("setupUnifiedPriceSlider:", error.message);
        cleanupPriceSliderEvents();
    }
}

const resetPriceFilter = () => {
  try {
    minPercent = 0;
    maxPercent = 100;
    priceRange = [minPrice, maxPrice];
    userHasChangedPriceRange = false;
    lastUserMinPrice = minPrice;
    lastUserMaxPrice = maxPrice;

    updatePriceSlider();
    mustUpdate = true;
    if (typeof busManipulation === "function") {
      console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk")
      busManipulation({
        source: {
          id: "cms.price.update",
          rows: [{ value: "reset" }],
        },
        context: {
          setAsSource: function () {},
          tryToGetSource: function () {
            return null;
          },
        },
      });
    }
  } catch (error) {
    console.error("resetPriceFilter: " + error.message);
  }
};
// price

function addFilterDiv(filterId, sourceId, value) {
  try {
    const filterContainer = document.querySelector(".book-mobile-filters");
    if (!filterContainer) return;

    const filterDiv = document.createElement("div");
    filterDiv.className = "book-filter-tag";
    filterDiv.setAttribute("data-filter-id", filterId);
    filterDiv.innerHTML = `
            <span>${value}</span>
            <button onclick="removeFilterDiv('${filterId}')" class="book-filter-remove">×</button>
        `;
    filterContainer.appendChild(filterDiv);
  } catch (error) {
    console.error("addFilterDiv: " + error.message);
  }
}



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

function findBusData(idToFind) {
  const cleanId = String(idToFind).trim();

  let foundObject = globalBusProposals.find(
    (item) => item && item.busId && String(item.busId).trim() === cleanId
  );

  if (foundObject) {
    return { object: foundObject, source: "global" };
  }

  foundObject = allBusProposals.find(
    (item) => item && item.busId && String(item.busId).trim() === cleanId
  );

  if (foundObject) {
    return { object: foundObject, source: "allBusProposals" };
  }

  if (
    globalListData &&
    globalListData.source &&
    Array.isArray(globalListData.source._rows)
  ) {
    const rows = globalListData.source._rows;
    if (rows.length && Array.isArray(rows[0].busProposals)) {
      foundObject = rows[0].busProposals.find(
        (item) => item && item.busId && String(item.busId).trim() === cleanId
      );
      if (foundObject) {
        return { object: foundObject, source: "listData" };
      }
    }
  }

  if (Array.isArray(BusProposalsSource)) {
    foundObject = BusProposalsSource.find(
      (item) => item && item.busId && String(item.busId).trim() === cleanId
    );
    if (foundObject) {
      return { object: foundObject, source: "BusProposalsSource" };
    }
  }

  return null;
}


