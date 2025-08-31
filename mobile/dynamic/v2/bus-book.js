/**
 * Global variables to store session search and booking data from sessionSearch.
 * Initialized as null to be populated on DOM load.
 */
let translations = {};
let currentLanguage = document.documentElement.lang || 'fa';
let isRTL = document.documentElement.dir === 'rtl' || currentLanguage === 'fa' || currentLanguage === 'ar';

let selectedMode = null;
let sessionSearchStorage = null;
let sessionBookStorage = null;
let sessionAmenitiesStorage = null;
let ExcessService = null;
let SeatSelection = null;
let dictionaries = [];
let schemaId; // session schema ID (e.g., 291: one-way, 290: round-trip, 292: multi-city)
let originalFirstPay;
let originalTotalCom;
let originalTotal;
let originalServiceTotalCost = 0;
const selectedSeats = []; // آرایه‌ی صندلی‌های انتخاب‌شده
let maxSelectableSeats = 4;
let lastDepartureDate = "";
let requestMappingCache = null;
let checkCouponUrl = null;
let supplierCreditUrl = null;
let commissionUrl = null;
let paymentStepUrl = null;
let productIdField = null;
let productGroupField = null;
// Always check for utm_source in URL
const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get("utm_source");
const MAX_PER_TYPEBook = 9; // Maximum passengers per type (adult, child, infant)
const MAX_TOTALBook = 9; // Maximum total passengers
let adultsCountBook = 1; // Number of adult passengers
let childrenCountBook = 0; // Number of child passengers
let infantsCountBook = 0; // Number of infant passengers
const isMobile = document.querySelector("main").dataset.mob === "true";
const domainId = document.querySelector("main").dataset.dmnid;
const safarmarketIdCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('safarmarketId='))
    ?.split('=')[1] || '';

let tripNames = [];
let gridPreviousPassengers;
let mobGridPreviousPassengers;

const busData = JSON.parse(sessionStorage.getItem("sessionBook")) || {};
const busGroup = busData.busGroup || [];
let index = -1;
let itemSelected;
let totalTime = 1200; // 20 minutes



function getTotalPrice() {
  try {
    const data = JSON.parse(sessionStorage.getItem("sessionBook"));
    if (data && data.priceInfo && data.priceInfo.total) {
      return parseInt(data.priceInfo.total);
    }
    return 0;
  } catch (error) {
    console.error("خطا در خواندن مبلغ کل:", error);
    return 0;
  }
}

function getTotalCommission() {
  try {
    const data = JSON.parse(sessionStorage.getItem("sessionBook"));
    if (data && data.priceInfo && data.priceInfo.totalCommission) {
      return parseInt(data.priceInfo.totalCommission);
    }
    return 0;
  } catch (error) {
    console.error("خطا در خواندن مبلغ کمیسیون:", error);
    return 0;
  }
}

function getBaseFare() {
  try {
    const data = JSON.parse(sessionStorage.getItem("sessionBook"));
    if (data && data.priceInfo && data.priceInfo.baseFare) {
      return parseInt(data.priceInfo.baseFare);
    }
    return 0;
  } catch (error) {
    console.error("خطا در خواندن مبلغ پایه:", error);
    return 0;
  }
}

const renderRoutesInfo = async (element) => {
  try {
    const t = (key, fallback = "") => (typeof translate === "function" ? translate(key) : fallback || key);

    // هم‌رفتار با renderAirlineInfo در پرواز
    const renderBusInfo = (icon, labelKey, value) => {
      try {
        if (value && value !== "") {
          return `
            <div class="">
              <div class="book-w-10 book-h-10 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded book-ml-2">
                <svg width="25" height="24" class="book-fill-primary-400">
                  <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
                </svg>
              </div>
              <div>
                <p class="book-text-zinc-500 book-my-2">${t(labelKey)}:</p>
                <p class="book-text-zinc-900">${value}</p>
              </div>
            </div>`;
        }
        return "";
      } catch (e) {
        console.error("renderBusInfo:", e.message);
        return "";
      }
    };

    // Helper ها
    const renderLocation = async (locationId) => {
      const location = busData?.dictionaries?.location?.[locationId] || {};
      return location.city || t("unknown_city", "Unknown");
    };

    const renderCountry = async (locationId) => {
      return busData?.dictionaries?.location?.[locationId]?.country || "";
    };

    const renderCarrierName = async (carrierCode) => {
      return busData?.dictionaries?.carriers?.[carrierCode]?.name || t("unknown_carrier", "Unknown");
    };

    // اگر لازم دارید تاریخ/مدت‌زمان را فرمت کنید، از همان توابع پرواز استفاده کنید
    const formatDate = async (val) => typeof renderFormatterDate === "function" ? await renderFormatterDate(val) : (val || "");
    const formatDuration = async (mins) =>  typeof renderFormatterDuration === "function" ? await renderFormatterDuration(mins) : (mins || "");





    // اگر برای اتوبوس مدت‌زمان ندارید، می‌توانیم از اختلاف زمان رسیدن/حرکت محاسبه کنیم (اختیاری):
    const getDurationLabel = async (item) => {
      if (item?.durationMinutes) return await formatDuration(item.durationMinutes);
      return ""; // در صورت نیاز محاسبه کنید
    };

    const routeHtml = async (bus, routeItem, index, isFirstInGroup, groupIndex) => {
      // عنوان مشابه پرواز – اگر مسیر رفت/برگشت دارید
      // let titleDiv = "";
      // if (isFirstInGroup && index === 0) {
      //   const titleKey = groupIndex === 0 ? "bus_outbound" : "bus_inbound";
      //   titleDiv = `
      //     <div class="book-route__title book-text-lg book-font-bold book-mb-4">
      //       ${t(titleKey, groupIndex === 0 ? "مسیر رفت" : "مسیر برگشت")}
      //     </div>`;
      // }

      // دیتای ترمینال‌ها
      const originTerminal = bus?.originTerminal || "";
      const destinationTerminal = bus?.destinationTerminal || "";

      // برچسب‌ها را با سیستم ترجمه همسو کردیم
      const busTypeLabelKey = "نوع اتوبوس";            // نوع اتوبوس
      const seatAvailLabelKey = "صندلی های موجود";   // صندلی‌های موجود
      const refundableLabelKey = "قابلیت استرداد";       // قابلیت استرداد
      const yesLabel = "دارد";
      const noLabel  = "ندارد";

      // محاسبه‌ی شهر/کشور
      const originCity = await renderLocation(routeItem.originRoute);
      const originCountry = await renderCountry(routeItem.originRoute);
      const destinationCity = await renderLocation(routeItem.destinationRoute);
      const destinationCountry = await renderCountry(routeItem.destinationRoute);

      // نام شرکت/اپراتور
      const carrierName = await renderCarrierName(routeItem.busOperatorCode);

      // مدت‌زمان (اگر وجود داشته باشد)
      const durationLabel = await getDurationLabel(routeItem);

                  //       <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${routeItem.arrivalTime || ""}</h5>
                  // <p class="book-text-zinc-500 book-text-sm">${await formatDate(routeItem.arrivalDate || "")}</p>
      return `
        <div class="book-route__info">
          <div class="book-flex md:book-flex-row book-mb-4">
            <div class="book-flex book-mb-4 md:book-mb-0 md:book-mr-6">
<div class="book-flight__details__progress__line book-ml-3 book-mr-3 book-relative"><svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-z-10"><use href="/booking/images/sprite-booking-icons.svg#bus-icon"></use></svg><svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book--bottom-3 book-z-10"><use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use></svg></div>
              <div class="book-flex book-flex-col book-border-l book-border-zinc-300 book-px-2 book-ml-3 book-justify-between">
                <div>
                  <h5 class="book-text-xl book-font-bold book-text-zinc-900">${originTerminal}</h5>
                  <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${routeItem.departureTime || ""}</h5>
                  <p class="book-text-zinc-500 book-text-sm">${await formatDate(routeItem.departureDate)}</p>
                </div>

                <div>
                  <h5 class="book-text-xl book-font-bold book-text-zinc-900">${destinationTerminal}</h5>

                </div>
              </div>
            </div>

            <div class="book-flex">
              <div class="book-flex book-flex-col">
                <div>
                  <h6 class="book-text-lg book-text-zinc-900">${originCity}</h6>
                  <p class="book-text-zinc-600 book-text-sm book-my-2">${originCity}${originCountry ? `, ${originCountry}` : ""}</p>
                  <div class="book-flex book-items-center book-gap-2">
                    <span class="book-text-zinc-900 book-text-sm">${carrierName}</span>
                  </div>
                </div>

                <div class="book-text-sm book-my-5">
                  <div class="book-grid book-grid-cols-2 sm:book-grid-cols-2 book-gap-2">
                    ${renderBusInfo("bus-type-icon", busTypeLabelKey, routeItem.busType)}
                    ${renderBusInfo("seat-available-bus-icon", seatAvailLabelKey, String(bus?.availableSeats ?? ""))}
                    ${renderBusInfo("refund-bus-icon", refundableLabelKey, bus?.refundable ? yesLabel : noLabel)}
                  </div>
                </div>

                <div>
                  <h6 class="book-text-lg book-text-zinc-900">${destinationCity}</h6>
                  <p class="book-text-zinc-600 book-text-sm book-my-2">${destinationCity}${destinationCountry ? `, ${destinationCountry}` : ""}</p>
                </div>
              </div>
            </div>
          </div>

        </div>`;
    };

    let output = "";
    for (let groupIndex = 0; groupIndex < (busGroup || []).length; groupIndex++) {
      const bus = busGroup[groupIndex];
      const routeHtmls = await Promise.all(
        (bus?.routesInfo || []).map((item, i) => routeHtml(bus, item, i, true, groupIndex))
      );
      output += routeHtmls.join("");
    }

    return output;
  } catch (error) {
    console.error("renderRoutesInfo:", error.message);
    return "";
  }
};


const onProcessedbusApiRule = async (args) => {
  try {
    const { response } = args;
    if (!response || response.status !== 200) return;

    const responseJson = await response.json();
    const busInfo = responseJson?.[0];
    if (!busInfo || !busInfo.busRules) return;

    const renderingContainer = document.querySelector(
      ".book-api__container__rendering"
    );
    if (!renderingContainer) return;

    let output = "";
    for (const item of busInfo.busRules) {
      if (item.rule?.length > 0) {
        output += `
                <div class="book-text-zinc-900 book-text-sm book-text-justify book-rtl">
                    <div class="book-mb-2 book-flex book-gap-1">
                        <span>${item.from}</span>
                        <svg width="24" height="24">
                            <use href="/booking/images/sprite-booking-icons.svg#right-arrow-icon"></use>
                        </svg>
                        <span>${item.to}</span>
                    </div>
                    <div>${await renderRule(item.rule)}</div>
                </div>`;
      }
    }

    renderingContainer.innerHTML = output || "قوانینی در دسترس نیست";
    renderingContainer.querySelector(".book-api__container__loader")?.remove();
  } catch (err) {
    console.error(
      `onProcessedbusApiRule: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};
 
const setbusGroup = async () => {
  try {
    // Load bus booking data from sessionStorage
    if (sessionStorage.getItem("sessionBook")) {
      const dict = sessionBookStorage.dictionaries;
      if (Array.isArray(dict)) {
        dictionaries = dict;
      } else if (typeof dict === "object" && dict !== null) {
        dictionaries = [dict];
      }
    }

    // Set booking data source if search data exists
    console.log("bus.book :" , sessionBookStorage)
    $bc.setSource("bus.book", sessionBookStorage);

    sessionSearchStorage = sessionStorage.getItem("sessionSearch")
      ? JSON.parse(sessionStorage.getItem("sessionSearch"))
      : null;

    $bc.setSource("cms.seat", {
      type: "upselling",
      busId: sessionBookStorage.busId,
      busGroup: JSON.stringify(sessionBookStorage.busGroup),
      dmnid: sessionSearchStorage.dmnid || 0,
      Type: sessionSearchStorage.Type || "",
      lid: sessionSearchStorage.lid || 1,
      SessionId: sessionSearchStorage.SessionId || "",
      run: true,
    });

    // Start the booking timer
    startTimer(); // Assumed to be defined elsewhere

    // Set expiry check for flight search and booking data (20 minutes)
    // getWithExpiry("sessionSearch", "sessionBook", "sessionAmenities"); // Assumed to be defined elsewhere

    // Extract rkey from cookie
    let cookieValue = `; ${document.cookie}`;
    let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
    let rkey = match ? match[1] : null;
    const { requests, productGroupField, productIdField } =
      getServiceMappingInfo(selectedMode);
    const supplierCreditUrl = requests.supplierCredit;
    // Set supplier credit check data source
    $bc.setSource("cms.supplierCredit", [
      {
        SessionId: sessionSearchStorage?.SessionId,
        Id: sessionBookStorage.busId,
        Group: JSON.stringify(sessionBookStorage.busGroup),
        selectedMode: selectedMode,
        rkey: rkey,
        url: supplierCreditUrl,
        productIdField: productIdField,
        productGroupField: productGroupField,
        run: true,
      },
    ]);

    // Store original price values
    originalFirstPay = sessionBookStorage.priceInfo.totalCommission;
    originalTotalCom = sessionBookStorage.priceInfo.totalCommission;
    originalTotal = sessionBookStorage.priceInfo.total;
  } catch (err) {
    console.error(
      `setbusGroup: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

const createSeatIdInput = (parentElement) => {
  const seatIdInput = document.createElement("input");
  seatIdInput.type = "hidden";
  seatIdInput.className = "seat-id";
  seatIdInput.name = `seat-id-selected`;
  // seatIdInput.name = `seat-id-${parentElement.getAttribute('data-index')}`;
  parentElement.appendChild(seatIdInput);
  return seatIdInput;
};



// Alternative version if you want to display seat info more prominently
const addPassengerWithSeatDisplay = (
  parentSelector,
  adults,
  children,
  infants
) => {
  try {
    const busId = sessionBookStorage.busId;
    const parent = document.querySelector(parentSelector);
    const templateElement = parent.querySelector(".book-passenger__container");
    parent.innerHTML = ""; // Clear existing content

    let dataIndex = 1;
    let adultCounter = 1,
      childCounter = 1,
      infantCounter = 1;
    let seatIndex = 0;

    const ordinalNumbers = [
      "اول",
      "دوم",
      "سوم",
      "چهارم",
      "پنجم",
      "ششم",
      "هفتم",
      "هشتم",
      "نهم",
      "دهم",
    ];

    const addCategory = (category, count, counter, type) => {
      for (let i = 0; i < count; i++) {
        const newElement = templateElement.cloneNode(true);
        newElement.setAttribute("data-index", dataIndex);

        // Update radio input names for uniqueness
        const typeContainer = newElement.querySelector(
          ".book-passenger__container__type"
        );
        if (typeContainer) {
          typeContainer.querySelectorAll("input[type=radio]").forEach((e) => {
            e.setAttribute("name", `type-${dataIndex}`);
          });
        }

        // Set data-index and type
        newElement
          .querySelector(".book-previous__passenger__container")
          .setAttribute("data-index", dataIndex);
        newElement.querySelector(".book-Type").value = type;

        // Enhanced title with seat information
        const ordinalText = ordinalNumbers[counter - 1] || `${counter}`;
        const titleElement = newElement.querySelector(
          ".book-passenger__container__title"
        );

        if (selectedSeats && selectedSeats[seatIndex]) {
          const seatInfo = selectedSeats[seatIndex];
          titleElement.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${category} ${ordinalText}</span>
                            <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                صندلی ${seatInfo.number}
                            </span>
                        </div>
                    `;

          // Store seat information
          newElement.setAttribute("data-seat-id", seatInfo.id);
          newElement.setAttribute("data-seat-number", seatInfo.number);

          // Add hidden input for seat ID
          const seatIdInput = document.createElement("input");
          seatIdInput.type = "hidden";
          seatIdInput.name = `seat-id-${dataIndex}`;
          seatIdInput.value = seatInfo.id;
          newElement.appendChild(seatIdInput);

          seatIndex++;
        } else {
          titleElement.textContent = `${category} ${ordinalText}`;
        }

        parent.appendChild(newElement);
        dataIndex++;
        counter++;
      }
    };

    // Add passengers for each category
    addCategory("بزرگسال", adults, adultCounter, "ADT");
    addCategory("کودک", children, childCounter, "CHD");
    addCategory("نوزاد", infants, infantCounter, "INF");
  } catch (err) {
    console.error(
      `addPassenger: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

const updateStep = (stepName, element) => {
  try {
    document.querySelector(".book-current__route__map").innerText = stepName;
    if (typeof updateStepItems === "function") {
      // Extract step name from text for updateStepItems function
      const stepMap = {
        "انتخاب صندلی": "seat",
        "مشخصات مسافران": "passenger",
        "مشخصات خریدار": "buyer",
        "خلاصه رزرو": "summary",
      };
      const stepKey = stepMap[stepName] || stepName;
      updateStepItems(stepKey);
    }
  } catch (err) {
    console.error(`updateStep: ${err.message}`);
  }
};


const updateStepItems = (element) => {
  try {
    const stepItems = document.getElementsByClassName("book-route__map__item");
    Array.from(stepItems).forEach((item) => {
      const isCurrentStep = item.getAttribute("data-step") === element;
      // Remove active state from all items
      item.classList.remove("book-route__map__item__active");
      // Add active state to the current step
      if (isCurrentStep) {
        item.classList.add("book-route__map__item__active");
      }
    });
  } catch (err) {
    console.error(
      `updateStepItems: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

// Step configuration for different booking types
const STEP_CONFIGS = {
  flight: {
    steps: ["passenger", "buyer", "summary"],
    stepLabels: {
      passenger: "مشخصات مسافران",
      buyer: "مشخصات خریدار",
      summary: "خلاصه رزرو",
    },
    containers: {
      passenger: ".book-passengers__container",
      buyer: ".book-buyers__container",
      summary: ".book-summary__container",
    },
  },
  bus: {
    steps: ["passengers", "passenger", "buyer", "summary"], // passengers = seat selection
    stepLabels: {
      passengers: "انتخاب صندلی",
      passenger: "مشخصات مسافران",
      buyer: "مشخصات خریدار",
      summary: "خلاصه رزرو",
    },
    containers: {
      passengers: ".book-seat_selection__container",
      passenger: ".book-passengers__container",
      buyer: ".book-buyers__container",
      summary: ".book-summary__container",
    },
  },
  busmobile: {
    steps: ["passengers", "passenger", "buyer", "summary"], // passengers = seat selection
    stepLabels: {
      passengers: "انتخاب صندلی",
      passenger: "مشخصات مسافران",
      buyer: "مشخصات خریدار",
      summary: "خلاصه رزرو",
    },
    containers: {
      passengers: ".book-seat_selection__container",
      passenger: ".book-passengers__container",
      buyer: ".book-buyers__container",
      summary: ".book-summary__container",
    },
  },
};


function detectBookingType() {
  if (document.querySelector(".seat-selection-container")) {
    return "bus";
  }
  if (document.querySelector(".mobile-seat-selection-container")) {
    return "busmobile";
  }

}


function getCurrentStepConfig() {
  const bookingType = detectBookingType();
  return STEP_CONFIGS[bookingType];
}


function getCurrentStepIndex(currentStep) {
  const config = getCurrentStepConfig();
  return config.steps.indexOf(currentStep);
}


function getNextStep(currentStep) {
  const config = getCurrentStepConfig();
  const currentIndex = getCurrentStepIndex(currentStep);

  if (currentIndex >= 0 && currentIndex < config.steps.length - 1) {
    return config.steps[currentIndex + 1];
  }
  return null;
}


function getPreviousStep(currentStep) {
  const config = getCurrentStepConfig();
  const currentIndex = getCurrentStepIndex(currentStep);

  if (currentIndex > 0) {
    return config.steps[currentIndex - 1];
  }
  return null;
}


function transitionToStep(fromStep, toStep, element) {
  const config = getCurrentStepConfig();

  // Hide current step container
  if (config.containers[fromStep]) {
    const fromContainer = document.querySelector(config.containers[fromStep]);
    if (fromContainer) {
      fromContainer.classList.add("book-hidden");
    }
  }

  // Show target step container
  if (config.containers[toStep]) {
    const toContainer = document.querySelector(config.containers[toStep]);
    if (toContainer) {
      toContainer.classList.remove("book-hidden");
    }
  }

  // Update UI elements
  const routeMapElement = document.querySelector(".book-current__route__map");
  if (routeMapElement && config.stepLabels[toStep]) {
    routeMapElement.innerText = config.stepLabels[toStep];
  }

  // Find both navigation buttons
  let prevButton, nextButton;

  // Determine which button was clicked and find the other one
  if (element.previousElementSibling) {
    // Element is likely the next button
    prevButton = element.previousElementSibling;
    nextButton = element;
  } else if (element.nextElementSibling) {
    // Element is likely the prev button
    prevButton = element;
    nextButton = element.nextElementSibling;
  } else {
    // Try to find buttons by class or other means
    const container = element.closest(
      ".book-navigation, .book-buttons, .step-navigation"
    );
    if (container) {
      prevButton = container.querySelector(
        '[data-step][onclick*="prevStep"], .prev-button, .book-prev'
      );
      nextButton = container.querySelector(
        '[data-step][onclick*="nextStep"], .next-button, .book-next'
      );
    }
  }

  // Update both buttons' data-step attributes
  if (prevButton) {
    prevButton.setAttribute("data-step", toStep);

    // Handle prev button visibility
    const hasPrevStep = getPreviousStep(toStep);
    if (hasPrevStep) {
      prevButton.classList.remove("book-hidden", "book-invisible");
    } else {
      prevButton.classList.add("book-invisible");
    }
  }

  if (nextButton) {
    nextButton.setAttribute("data-step", toStep);

    // Handle next button visibility
    const hasNextStep = getNextStep(toStep);
    if (hasNextStep) {
      nextButton.classList.remove("book-hidden", "book-invisible");
    } else {
      // On last step, you might want to change button text or hide it
      // Based on your original code, it seems like summary step shows invoice
      // nextButton.classList.add('book-invisible');
    }
  }

  // Update step indicators
  if (typeof updateStepItems === "function") {
    updateStepItems(toStep);
  }
}


const nextStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const bookingType = detectBookingType();

    if ((bookingType === "bus" || bookingType === "busmobile" ) && currentStep === "passengers") {
      // Bus: Seat selection validation
      let isValid = true;
      const seatContainer = document.querySelector(".seat-selection-container");
      const seatError = seatContainer.querySelector(".book-alert__content");
      if (seatError) seatError.remove();

      // Check if at least one seat is selected and within limit
      if (typeof selectedSeats !== "undefined") {
        if (selectedSeats.length === 0) {
          // bookToast("لطفاً حداقل یک صندلی انتخاب کنید.");

          seatContainer.insertAdjacentHTML('beforeend',
              `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفاً حداقل یک صندلی انتخاب کنید.</div>`);
          isValid = false;
        } else if (
          typeof maxSelectableSeats !== "undefined" &&
          selectedSeats.length > maxSelectableSeats
        ) {
          // bookToast(
          //   `حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.`
          // );

          seatContainer.insertAdjacentHTML('beforeend',
              `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.</div>`);
          isValid = false;
        }
      }

      if (isValid) {
        const nextStep = getNextStep(currentStep);
        if (nextStep) {
          transitionToStep(currentStep, nextStep, element);
        }
      }
    } else if (currentStep === "passenger") {
      // Passenger information validation (same for both flight and bus)
      let isExist = true;
      let isValid = true;
      const passengerInfoContents = document.querySelectorAll(
        ".book-passenger__container"
      );

      // Check required fields and dates for each passenger
      passengerInfoContents.forEach((passengerContent) => {
        if (
          !passengerContent
            .closest(".book-passengers__content")
            .classList.contains("book-hidden")
        ) {
          const numberItems = passengerContent.querySelectorAll(
            ".book-info__item__container"
          );
          numberItems.forEach((e) => {
            // Remove existing error messages
            const description = e.querySelector(".book-alert__content");
            if (description) description.remove();

            // Validate required fields
            const necessaryField = e.querySelector(".book-Required");
            if (necessaryField) {
              const innerItem = necessaryField.closest(
                ".book-info__item__content"
              );
              innerItem.classList.remove("book-invalid");
              if (necessaryField.value === "") {
                innerItem.classList.add("book-invalid");
                // bookToast("مشخصات مسافر را وارد کنید.");

                e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
                isExist = false;
              }
            }

            // Validate date fields
            const dateItems = e.querySelectorAll(".book-date__item__content");
            dateItems.forEach((dateItem) => {
              const dateNecessaryField =
                dateItem.querySelector(".book-Required");
              if (dateNecessaryField) {
                const dateInnerItem = dateNecessaryField.closest(
                  ".book-info__item__content"
                );
                dateInnerItem.classList.remove("book-invalid");
                if (
                  dateNecessaryField.value === "" ||
                  !dateNecessaryField.getAttribute("data-id") ||
                  dateNecessaryField.getAttribute("data-id") === ""
                ) {
                  dateInnerItem.classList.add("book-invalid");
                  if (!e.querySelector(".book-alert__content")) {
                    // bookToast("مشخصات مسافر را وارد کنید.");

                    e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
                  }
                  isExist = false;
                }
              }
            });
          });
        }
      });

      if (isExist) {
        // Get departure date based on booking type
        let exitDateMsDate;
        if (bookingType === "bus" || bookingType === "busmobile" ) {
          const exitDateMs = document.querySelector(
            ".book-DepartureDate"
          )?.value;
          exitDateMsDate = exitDateMs ? new Date(exitDateMs) : null;
        } else {
          // Flight: use lastDepartureDate if available
          exitDateMsDate =
            typeof lastDepartureDate !== "undefined"
              ? new Date(lastDepartureDate)
              : null;
        }

        const passengerContents = document.querySelectorAll(
          ".book-passenger__container"
        );

        passengerContents.forEach((passengerContent) => {
          if (
            !passengerContent
              .closest(".book-passengers__content")
              .classList.contains("book-hidden")
          ) {
            const passengerType =
              passengerContent.querySelector(".book-Type").value;
            const birthdayField =
              passengerContent.querySelector(".book-DateOfBirth");

            if (typeof checkDate === "function") {
              birthdayField.value = checkDate(birthdayField.value);
            }

            let birthday = birthdayField.value;
            const birthParts = birthday.split("-");

            // Validate birth date
            const [checkYear, checkMonth, checkDay] = birthParts.map((part) =>
              parseInt(part, 10)
            );
            const birthdayDate = new Date(birthday);

            if (
              isNaN(checkYear) ||
              isNaN(checkMonth) ||
              isNaN(checkDay) ||
              checkMonth < 1 ||
              checkMonth > 12 ||
              checkDay < 1 ||
              checkDay > new Date(checkYear, checkMonth, 0).getDate() ||
              isNaN(birthdayDate.getTime())
            ) {
              if (typeof addDateError === "function") {
                addDateError("تاریخ معتبر وارد کنید.", birthdayField);
              }
              isValid = false;
            } else {
              if (typeof removeDateError === "function") {
                removeDateError(birthdayField);
              }

              // Calculate age
              const cmsDate =
                document.querySelector(".book-layout__main")?.dataset.cmsdate;
              if (cmsDate) {
                const formattedDate = cmsDate
                  .split("/")
                  .map((part) => part.padStart(2, "0"))
                  .join("-");
                const [MM, DD, YYYY] = formattedDate.split("-");
                const finalDate = `${YYYY}-${MM}-${DD}`;
                const currentDate = new Date(finalDate);
                const daysDiff = Math.ceil(
                  (currentDate - birthdayDate) / (1000 * 3600 * 24)
                );
                const age = Math.floor(daysDiff / 365);

                // Validate age based on passenger type
                if (passengerType === "ADT" && (age < 12 || age > 98)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای بزرگسال تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else if (passengerType === "CHD" && (age < 2 || age > 12)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای کودک تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else if (passengerType === "INF" && (age < 0 || age > 2)) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "برای نوزاد تاریخ تولد معتبر وارد کنید",
                      birthdayField
                    );
                  }
                  isValid = false;
                } else {
                  if (typeof removeDateError === "function") {
                    removeDateError(birthdayField);
                  }
                }
              }
            }

            // Validate passport expiration (if applicable)
            const passExpireField = passengerContent.querySelector(
              ".book-PassportExpiration"
            );
            if (
              passExpireField &&
              passExpireField
                .closest(".book-info__item__container")
                .querySelector(".book-day")
                ?.classList.contains("book-Required")
            ) {
              if (typeof checkDate === "function") {
                passExpireField.value = checkDate(passExpireField.value);
              }

              let passExpireDate = passExpireField.value;
              const passExpireParts = passExpireDate.split("-");
              const year = parseInt(passExpireParts[0], 10);
              const month = parseInt(passExpireParts[1], 10);
              const day = parseInt(passExpireParts[2], 10);
              const passExpireDateObject = new Date(passExpireDate);

              if (
                isNaN(year) ||
                isNaN(month) ||
                isNaN(day) ||
                isNaN(passExpireDateObject.getTime()) ||
                month < 1 ||
                month > 12 ||
                day < 1 ||
                day > new Date(year, month, 0).getDate()
              ) {
                if (typeof addDateError === "function") {
                  addDateError("تاریخ معتبر وارد کنید.", passExpireField);
                }
                isValid = false;
              } else if (exitDateMsDate) {
                // Check 6-month validity
                const timeDiff =
                  passExpireDateObject.getTime() - exitDateMsDate.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                if (daysDiff < 183) {
                  if (typeof addDateError === "function") {
                    addDateError(
                      "تاریخ انقضای گذرنامه باید بیشتر از 6 ماه باشد.",
                      passExpireField
                    );
                  }
                  isValid = false;
                } else {
                  if (typeof removeDateError === "function") {
                    removeDateError(passExpireField);
                  }
                }
              }
            }

            // Additional validations (passport code, national code, English fields, etc.)
            // ... (keeping your existing validation logic)
          }
        });

        if (isValid) {
          // Transition to buyer step or login
          const mainUserId = document.querySelector(".main-userid")?.value;
          if (mainUserId === "0") {
            if (typeof showLoginContainer === "function") {
              showLoginContainer();
            }
          } else {
            const nextStep = getNextStep(currentStep);
            if (nextStep) {
              transitionToStep(currentStep, nextStep, element);

              // Initialize buyer container if needed
              const buyersContainer = document.querySelector(
                ".book-buyers__container"
              );
              if (
                buyersContainer &&
                buyersContainer.getAttribute("data-run") === "0"
              ) {
                if (typeof $bc !== "undefined" && $bc.setSource) {
                  $bc.setSource("cms.buyer", true);
                  buyersContainer.setAttribute("data-run", "1");
                }
              }
            }
          }
        }
      }
    } else if (currentStep === "buyer") {

       // Validate buyer information
        let isExist = true;
        let isValid = true;
        let isVerify = true;

        document.querySelectorAll(".book-buyer__info__content").forEach(buyerContent => {
            buyerContent.querySelectorAll(".book-info__item__container").forEach(e => {
                // Remove existing error messages
                const description = e.querySelector(".book-alert__content");
                if (description) description.remove();

                // Validate required fields
                const necessaryField = e.querySelector(".book-Required");
                if (necessaryField) {
                    necessaryField.closest(".book-info__item__content").classList.remove("book-invalid");
                    if (necessaryField.value === "") {
                        necessaryField.closest(".book-info__item__content").classList.add("book-invalid");
                        e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("enter_buyer_info")}</div>`);
                        isExist = false;
                    }
                }

                // Validate number fields
                e.querySelectorAll(".book-number__item__container").forEach(numberItem => {
                    const codeField = numberItem.querySelector(".book-code");
                    if (codeField) {
                        codeField.closest(".book-info__item__content").classList.remove("book-invalid");
                        if (codeField.value === "") {
                            codeField.closest(".book-info__item__content").classList.add("book-invalid");
                            isExist = false;
                        }
                    }
                });
            });
        });

        if (isExist) {
            // Validate agency selection
            if (document.querySelector(".book-buyer-1")) {
                const agencyContent = document.querySelector(".book-buyer__agency__content");
                const selectedAgency = document.querySelector(".book-selected__agency");
                if (!agencyContent.classList.contains("book-hidden") &&
                    (!selectedAgency.getAttribute("data-id") || selectedAgency.getAttribute("data-id") === '')) {
                    isValid = false;
                    selectedAgency.closest(".book-info__item__container").insertAdjacentHTML('beforeend',
                        `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("select_suggested_agency")}</div>`);
                }
            }

            // Validate buyer fields
            function validateField(element, className, regex, errorMessage) {
                try {
                    const field = element.querySelector(className);
                    if (field?.classList.contains("book-Required")) {
                        if (!regex.test(field.value)) {
                            field.closest(".book-info__item__content").classList.add("book-invalid");
                            element.insertAdjacentHTML('beforeend',
                                `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${errorMessage}</div>`);
                            return false;
                        }
                        field.closest(".book-info__item__content").classList.remove("book-invalid");
                        return true;
                    }
                    return true;
                } catch (error) {
                    console.error("validateField: " + error.message);
                    return false;
                }
            }

            Array.from(document.getElementsByClassName("book-buyer__info__content")).forEach(buyerInfo => {
                // Validate name
                Array.from(buyerInfo.getElementsByClassName("book-name")).forEach(e => {
                    if (!validateField(e.closest(".book-info__item__container"), ".book-name", /^.{2,}$/,
                        `${translate("minimum_character_2")}`)) {
                        isValid = false;
                    }
                });

                // Validate email
                Array.from(buyerInfo.getElementsByClassName("book-email")).forEach(e => {
                    if (!validateField(e.closest(".book-info__item__container"), ".book-email",
                        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, `${translate("invalid_email")}`)) {
                        isValid = false;
                    }
                });

                // Validate address
                Array.from(buyerInfo.getElementsByClassName("book-address")).forEach(e => {
                    if (!validateField(e.closest(".book-info__item__container"), ".book-address", /^.{5,}$/,
                        `${translate("minimum_character_5")}`)) {
                        isValid = false;
                    }
                });

                // Validate mobile
                Array.from(buyerInfo.getElementsByClassName("book-number__item__container")).forEach(e => {
                    if (e.querySelector(".book-code__number")?.value === '+98') {
                        if (!validateField(e, ".book-mobile", /^9([0123645789]{9})$/,
                            `${translate("invalid_mobile_format")}`)) {
                            isValid = false;
                        }
                    }
                });
            });

            if (isValid) {
                // Handle email/mobile verification
                function handleVerification(e, type) {
                    try {
                        const verifyContainer = type === 'email'
                            ? document.querySelector(".book-email-verify-container")
                            : document.querySelector(".book-mobile-verify-container");
                        const verifyInput = verifyContainer.querySelector(`.${type}-verify`);
                        verifyContainer.classList.remove("book-hidden");
                        verifyInput.value = e.value;
                        if (type === 'mobile') {
                            const codeContainer = verifyContainer.querySelector(".book-code-verify-container");
                            const btnItem = verifyContainer.querySelector(".book-btn__content");
                            codeContainer.classList.add("book-hidden");
                            btnItem.dataset.type = 'verifyrequest';
                            btnItem.innerHTML = `${translate("send_code")}`;
                        }
                    } catch (error) {
                        console.error("handleVerification: " + error.message);
                    }
                }

                document.querySelector(".book-check__has__data").querySelectorAll("input").forEach(e => {
                    if (e.dataset.verify && e.dataset.verify === 'false') {
                        if (document.querySelector(".book-verify-request-container").classList.contains("book-verify-request-container-toggle")) {
                            document.querySelector(".book-verify-request-container").classList.toggle("book-verify-request-container-toggle");
                        }
                        isVerify = false;
                        if (e.classList.contains("book-email")) {
                            handleVerification(e, 'email');
                        }
                        if (e.classList.contains("book-mobile")) {
                            handleVerification(e, 'mobile');
                        }
                    }
                });

                if (isVerify) {
                    // Set dash for empty fields
                    document.querySelectorAll(".book-buyer__info__content").forEach(content => {
                        content.querySelectorAll(".book-has-dash").forEach(input => {
                            if (input.value === '') {
                                input.value = '-';
                            }
                        });
                    });

                    // Transition to summary step
                    document.querySelector(".book-buyers__container").classList.add("book-hidden");
                    showSummaryContent(element);
                }
            }
        }

    } else if (currentStep === "summary") {
      // Validate summary step
      let isValid = true;
      const removeDescription = (container) => {
        const description = container.querySelector(".book-alert__content");
        if (description) description.remove();
      };

      // Validate company rules checkbox
      const ruleContent = document.querySelector(
        ".book-company__rule__container"
      );
      removeDescription(ruleContent);
      if (!ruleContent.querySelector("input[type=checkbox]").checked) {
        // bookToast("لطفا قوانین و مقررات را تایید فرمایید");

        ruleContent.insertAdjacentHTML('beforeend',
            `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا قوانین و مقررات را تایید فرمایید</div>`);
        isValid = false;
      }

      // Validate counter selection
      const counterContent = document.querySelector(".book-counter__container");
      removeDescription(counterContent);
      if (counterContent.classList.contains("book-Required")) {
        const counterName = counterContent.querySelector(".book-name").value;
        if (counterName === "") {
          // bookToast("لطفا کانتر اقدام کننده را انتخاب فرمایید");

          counterContent.insertAdjacentHTML('beforeend',
              `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا کانتر اقدام کننده را انتخاب فرمایید</div>`);
          isValid = false;
        }
      }

       if (isValid) {
            // Transition to invoice step
            const invoiceContainer = document.querySelector(".book-invoice__container");
            invoiceContainer.classList.remove("book-hidden");
            if (invoiceContainer.querySelectorAll(".book-invoice__content")[0]) {
                invoiceContainer.querySelectorAll(".book-invoice__content").forEach(e => {
                    e.remove()
                })
            };
            if (invoiceContainer.querySelector(".book-api__container__loader")) {
                invoiceContainer.querySelector(".book-api__container__loader").remove()
            };
            invoiceContainer.insertAdjacentHTML('beforeend', `<span
                                                  class="book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-m-3"></span>`);

            // Handle invoice rendering based on account type
            const accountType = document.querySelector(".book-buyers__container").dataset.accounttype;
            // Commented out as per original code
            const share = sessionSearchStorage.share;
            if (Number(share) === 1) {
                invoiceContainer.innerHTML =
                    `<div class="book-invoice__content book-pre__Invoice book-my-2" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">${translate("click_to_register_contract")}</div>`;
                document.querySelector(".book-bankIdentifier").value = -1;
            } else if (Number(accountType) === 1) {
                invoiceContainer.innerHTML =
                    `<div class="book-invoice__content book-pre__Invoice book-my-2 book-text-xl book-text-center book-cursor-pointer" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">${translate("click_to_register_pre_invoice")}</div>`;
            } else {
                let cookieValue = `; ${document.cookie}`;
                let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
                let rkey = match ? match[1] : null;
                const {
                    requests,
                    productGroupField,
                    productIdField
                } = getServiceMappingInfo(selectedMode);
                const userCreditUrl = requests.userCredit;
                console.log(userCreditUrl , "userrrrrrrrrrrrrrrrrrrrrrrrrcreditttttttttttttttttttttt");
                $bc.setSource("cms.bankList", [{
                    engine: (
                        (utmSource === "safarmarket")
                            ? 2
                            : ""
                    ),
                    rkey: rkey,
                    selectedMode: selectedMode,
                    userCreditUrl: userCreditUrl,
                    run: true
                }]);

            }
            /* } */
        }
    }
  } catch (err) {
    console.error(
      `nextStep: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};


const prevStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const previousStep = getPreviousStep(currentStep);

    if (!previousStep) {
      // Already at first step
      return;
    }

            if (currentStep === "buyer") {
            // Transition from buyer to passenger step
            toggleVisibility(".book-passengers__container", ".book-buyers__container");
            document.querySelector(".book-current__route__map").innerText = `${translate("passengerInfo")}`;
            element.classList.add("book-hidden");
            updateStep(`${translate("passengerInfo")}`, element);
        } else if (currentStep === "summary") {
            // Transition from summary to buyer step
            // Reset coupon if applicable
            const couponResponse = document.querySelector('.book-coupon__container .book-response-code');
            if (couponResponse && couponResponse.classList.contains('book-true')) {
                const couponCode = document.querySelector(".book-coupon__code");
                const couponButton = document.querySelector(".book-coupon__container button");
                couponCode.value = "";
                couponButton.click();
            }

            // Hide invoice container if visible
            const summaryInvoice = document.querySelector(".book-invoice__container");
            if (!summaryInvoice.classList.contains("book-hidden")) {
                summaryInvoice.classList.add("book-hidden");
            }

            // Remove error messages from rule and counter containers
            ["book-rule__container", "book-counter__container"].forEach(className => {
                const description = document.querySelector(`.${className} .book-description`);
                if (description) description.remove();
            });

            // Show buyer container and hide summary
            toggleVisibility(".book-buyers__container", ".book-summary__container");
            element.classList.remove("book-hidden");
            updateStep(`${translate("buyer_info")}`, element);
        }

    // Special handling for bus seat selection
    const bookingType = detectBookingType();
    if ((bookingType === "bus" || bookingType === "busmobile" ) && previousStep === "passengers") {
      // Re-render seat map if going back to seat selection
      if (
        typeof onProcessedRenderSeatMapSelection === "function" &&
        window.seatMapResponse
      ) {
        setTimeout(() => {
          onProcessedRenderSeatMapSelection({
            response: window.seatMapResponse,
          });
        }, 100);
      }
    }

    // Perform the transition
    transitionToStep(currentStep, previousStep, element);

    // Update current prev button step
    element.setAttribute("data-step", previousStep);

    // Find and update next button step
    const nextButton = element.nextElementSibling;
    if (nextButton) {
      nextButton.setAttribute("data-step", previousStep);
    }

    // Handle navigation button visibility
    const config = getCurrentStepConfig();
    const stepIndex = config.steps.indexOf(previousStep);

    if (stepIndex === 0) {
      // Going back to first step - hide previous button
      element.classList.add("book-invisible");
    } else {
      // Make sure previous button is visible for middle steps
      element.classList.remove("book-invisible", "book-hidden");
    }

    // Make sure next button is visible when going back from last step
    if (nextButton && stepIndex < config.steps.length - 1) {
      nextButton.classList.remove("book-invisible", "book-hidden");
    }
  } catch (err) {
    console.error(
      `prevStep: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};


const onProcessedRenderSeatMapSelection = async (args) => {
  try {
    const { response } = args;
    if (response.status !== 200) return;

    const responseJson = await response.json();
    const renderingContainer = document.querySelector(".seat-selection-container .seat-load");
    if (!renderingContainer) return;

    const { layout, col, row } = responseJson;
    const columns = parseInt(col, 10);
    const rows = parseInt(row, 10);

    const createSeatButton = (seat, indexInRow) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = seat.number;

      btn.className = `book-bg-center book-bg-cover book-w-[30px] book-h-[34px] book-flex book-justify-center book-items-center`;

      if (indexInRow === 1) {
        btn.classList.add("book-mb-[50px]");
      }

      if (seat.status === "reserved") {
        if (seat.gender === "Female") {
          btn.classList.add("book-seat-ladies", "book-text-[#c60055]");
          btn.title = "Ladies";
        } else {
          btn.classList.add(
            "book-seat-by-for-gentlemans",
            "book-text-primary-900"
          );
          btn.title = "Gentleman";
        }
        btn.disabled = true;
      } else if (seat.status === "available") {
        btn.classList.add("book-seat-available", "book-text-zinc-900");
        btn.title = "Available";

        btn.addEventListener("click", () => {
          const seatIndex = selectedSeats.findIndex(
            (s) => s.number === seat.number
          );

          if (seatIndex === -1) {
            if (selectedSeats.length >= maxSelectableSeats) {
              // bookToast(
              //   `شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.`
              // );
              // alert(`شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.`);

                        selectedSeats.insertAdjacentHTML('beforeend',
              `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.</div>`);


              return;
            }
            selectedSeats.push(seat);
            btn.classList.add("book-seat-selected");
          } else {
            selectedSeats.splice(seatIndex, 1);
            btn.classList.remove("book-seat-selected");
          }

          const seatCountElement = document.getElementById("seat-countnum");
          if (seatCountElement) {
            seatCountElement.textContent = selectedSeats.length;
            console.log(selectedSeats);
          }
          handleSeatSelection(seat);
        });
      }

      return btn;
    };

    const createGap = (indexInRow) => {
      const span = document.createElement("span");
      span.className = `book-w-[30px] book-h-[34px]`;
      if (indexInRow === 1) {
        span.classList.add("book-mb-[50px]");
      }
      return span;
    };

    renderingContainer.innerHTML = "";
    let currentRow = null;
    let seatCountInRow = 0;
    let rowCount = 0;

    for (let i = 0; i < layout.length; i++) {
      if (seatCountInRow === 0) {
        currentRow = document.createElement("div");
        currentRow.className =
          "book-w-full book-flex book-items-center book-gap-2 book-justify-between book-flex-col";
        currentRow.setAttribute("dir", "ltr");
      }

      const item = layout[i];

      if (item.type === "seat") {
        const btn = createSeatButton(item, seatCountInRow);
        currentRow.appendChild(btn);
        seatCountInRow++;
      } else if (item.type === "gap") {
        const gap = createGap(seatCountInRow);
        currentRow.appendChild(gap);
        seatCountInRow++;
      }

      if (seatCountInRow === columns) {
        renderingContainer.appendChild(currentRow);
        seatCountInRow = 0;
        rowCount++;
      }
    }

    if (seatCountInRow > 0 && currentRow) {
      while (seatCountInRow < columns) {
        const gap = createGap(seatCountInRow);
        currentRow.appendChild(gap);
        seatCountInRow++;
      }
      renderingContainer.appendChild(currentRow);
    }

    while (rowCount < rows) {
      const emptyRow = document.createElement("div");
      emptyRow.className =
        "book-w-full book-flex book-items-center book-gap-2 book-justify-between book-flex-col";
      emptyRow.setAttribute("dir", "ltr");
      for (let i = 0; i < columns; i++) {
        const gap = createGap(i);
        emptyRow.appendChild(gap);
      }
      renderingContainer.appendChild(emptyRow);
      rowCount++;
    }

    selectedSeats.forEach((selected) => {
      const buttons = renderingContainer.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (btn.textContent === selected.number) {
          btn.classList.add("book-seat-selected");
        }
      });
    });
  } catch (error) {
    console.error("onProcessedRenderSeatMapSelection: " + error.message);
  }
};


const onProcessedRenderMobSeatMapSelection = async (args) => {
  try {
    if (!args || !args.response) {
      console.error("onProcessedRenderMobSeatMapSelection: Invalid arguments");
      return;
    }

    const { response } = args;
    if (response.status !== 200) return;

    const responseJson = await response.json();

    // 1) اول سعی کن مثل دسکتاپ همون کانتینر استاندارد رو بگیری
    let renderingContainer = document.querySelector(".seat-selection-container .seat-load");

    // 2) اگر نبود، فallback به seat-id-<busId> (در صورت موجود بودن در DOM)
    if (!renderingContainer) {
      const busId = responseJson.busId;
      if (busId) {
        const escapedBusId = CSS.escape(busId);
        renderingContainer = document.querySelector(`.seat-id-${escapedBusId}`);
      }
    }
    if (!renderingContainer) return;

    const { layout, col, row } = responseJson;
    const columns = parseInt(col, 10);
    const rows = parseInt(row, 10);

    // کمکی: کلاس اضافه کن بدون پاک‌کردن کلاس‌های قبلی
    const addClasses = (el, cls) => {
      cls.split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
    };

    // کانتینر را برای موبایل عمودی کن، اما کلاس‌های قبلی را نگه دار
    addClasses(renderingContainer, "book-flex book-flex-col book-items-center book-gap-2 book-w-full");
    renderingContainer.setAttribute("dir", "ltr");
    renderingContainer.innerHTML = "";

    // دکمه صندلی (با منطق انتخاب مثل دسکتاپ)
    const createSeatButton = (seat, indexInRow) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = seat.number;
      addClasses(btn, "book-bg-center book-bg-cover book-w-[30px] book-h-[34px] book-flex book-justify-center book-items-center");

      // فاصله راهرو ستون دوم برای موبایل
      if (indexInRow === 1) {
        addClasses(btn, "book-mx-4");
      }

      if (seat.status === "reserved") {
        if (seat.gender === "Female") {
          addClasses(btn, "book-seat-ladies book-text-[#c60055]");
          btn.title = "Ladies";
        } else {
          addClasses(btn, "book-seat-by-for-gentlemans book-text-primary-900");
          btn.title = "Gentleman";
        }
        btn.disabled = true;
      } else if (seat.status === "available") {
        addClasses(btn, "book-seat-available book-text-zinc-900");
        btn.title = "Available";

        btn.addEventListener("click", () => {
          const seatIndex = selectedSeats.findIndex((s) => s.number === seat.number);

          if (seatIndex === -1) {
            if (selectedSeats.length >= maxSelectableSeats) {
              // bookToast?.(`شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.`);
                        selectedSeats.insertAdjacentHTML('beforeend',
              `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.</div>`);

              return;
            }
            selectedSeats.push(seat);
            btn.classList.add("book-seat-selected");
          } else {
            selectedSeats.splice(seatIndex, 1);
            btn.classList.remove("book-seat-selected");
          }

          const seatCountElement = document.getElementById("seat-countnum");
          if (seatCountElement) seatCountElement.textContent = selectedSeats.length;
          handleSeatSelection(seat);
        });
      }

      return btn;
    };

    const createGap = (indexInRow) => {
      const span = document.createElement("span");
      addClasses(span, "book-w-[30px] book-h-[34px]");
      if (indexInRow === 1) addClasses(span, "book-mx-4"); // راهرو
      return span;
    };

    // ساخت ردیف‌ها (هر ردیف افقی، کل کانتینر عمودی)
    let currentRow = null;
    let seatCountInRow = 0;
    let rowCount = 0;

    for (let i = 0; i < layout.length; i++) {
      if (seatCountInRow === 0) {
        currentRow = document.createElement("div");
        addClasses(currentRow, "book-w-full book-flex book-items-center book-gap-2 book-justify-center");
        currentRow.setAttribute("dir", "ltr");
      }

      const item = layout[i];

      if (item.type === "seat") {
        currentRow.appendChild(createSeatButton(item, seatCountInRow));
        seatCountInRow++;
      } else if (item.type === "gap") {
        currentRow.appendChild(createGap(seatCountInRow));
        seatCountInRow++;
      }

      if (seatCountInRow === columns) {
        renderingContainer.appendChild(currentRow);
        seatCountInRow = 0;
        rowCount++;
      }
    }

    // ردیف ناقص آخر
    if (seatCountInRow > 0 && currentRow) {
      while (seatCountInRow < columns) {
        currentRow.appendChild(createGap(seatCountInRow));
        seatCountInRow++;
      }
      renderingContainer.appendChild(currentRow);
      rowCount++;
    }

    // پر کردن تا rows
    while (rowCount < rows) {
      const emptyRow = document.createElement("div");
      addClasses(emptyRow, "book-w-full book-flex book-items-center book-gap-2 book-justify-center");
      emptyRow.setAttribute("dir", "ltr");
      for (let i = 0; i < columns; i++) emptyRow.appendChild(createGap(i));
      renderingContainer.appendChild(emptyRow);
      rowCount++;
    }

    // بازگردانی انتخاب‌های قبلی داخل همین کانتینر
    const buttons = renderingContainer.querySelectorAll("button");
    selectedSeats.forEach((selected) => {
      buttons.forEach((btn) => {
        if (btn.textContent === selected.number) btn.classList.add("book-seat-selected");
      });
    });
  } catch (error) {
    console.error("onProcessedRenderMobSeatMapSelection: " + error.message);
  }
};

function handleSeatSelection(seat) {
  if (selectedSeats.length > 0) {
    // Extract passenger counts from search data
    const Adults = sessionBookStorage.priceInfo.passengerFare[0].count;
    const Children = sessionBookStorage.priceInfo.passengerFare[1].count;
    const Infants = sessionBookStorage.priceInfo.passengerFare[2].count;

    const Adults2 = selectedSeats.length;
    const Children2 = 0;
    const Infants2 = 0;

    // Determine if the bus is internal (domestic) from dictionaries
    const internal = dictionaries[0] ? dictionaries[0].internal : "";

    // Get provider ID from booking data
    const Provider = sessionBookStorage.Provider.Dmnid;

    // Show appropriate passenger container based on bus type (internal/external)
    if (internal === true) {
      document
        .querySelector(".book-passengers__container__internal")
        .classList.remove("book-hidden");
      addPassenger(
        ".book-passengers__container__internal",
        Adults2,
        Children2,
        Infants2
      );
    } else {
      document
        .querySelector(".book-passengers__container__external")
        .classList.remove("book-hidden");
      addPassenger(
        ".book-passengers__container__external",
        Adults2,
        Children2,
        Infants2
      );
    }
  }
}


// function bookToast(text) {
//   try {
//     // استک توست‌ها (در اولین اجرا ساخته می‌شود)
//     let stack = document.getElementById("book-toast-stack");
//     if (!stack) {
//       stack = document.createElement("div");
//       stack.id = "book-toast-stack";
//       stack.className =
//         "book-fixed book-right-6 book-top-6 book-z-50 book-space-y-3 " +
//         "book-pointer-events-none"; // تا کلیک‌های زیرین قابل دسترسی بماند
//       document.body.appendChild(stack);
//     }

//     // خود توست
//     const toast = document.createElement("div");
//     toast.setAttribute("role", "status");
//     toast.setAttribute("aria-live", "polite");
//     toast.className =
//       "book-pointer-events-auto book-max-w-md " +
//       "book-font-bold book-border-2 book-bg-red-300 book-text-red-600 book-border-red-600 book-rounded-lg " +
//       "book-shadow-lg book-text-sm book-leading-6 " +
//       "book-px-4 book-py-3 " +
//       "book-opacity-0 book-translate-y-2 " + // حالت اولیه برای انیمیشن ورود
//       "book-transition book-duration-300 book-ease-out";
//     toast.textContent = text;

//     // بستن با کلیک (اختیاری)
//     toast.addEventListener("click", () => dismiss());

//     // اضافه به استک
//     stack.appendChild(toast);

//     // انیمیشن ورود
//     requestAnimationFrame(() => {
//       toast.classList.remove("book-opacity-0", "book-translate-y-2");
//     });

//     // تایمر اتومات خروج
//     const LIFE = 4000; // میلی‌ثانیه
//     const t = setTimeout(() => dismiss(), LIFE);

//     function dismiss() {
//       clearTimeout(t);
//       toast.classList.add("book-opacity-0", "book-translate-y-2");
//       toast.addEventListener(
//         "transitionend",
//         () => {
//           toast.remove();
//           // اگر استک خالی شد، خودش هم پاک شود
//           if (!stack.children.length) stack.remove();
//         },
//         { once: true }
//       );
//     }
//   } catch (err) {
//     console.error("bookToast error:", err);
//   }
// }