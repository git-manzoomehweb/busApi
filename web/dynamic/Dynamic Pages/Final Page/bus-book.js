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

const isMobile = document.querySelector("main").dataset.mob === "true";
const domainId = document.querySelector("main").dataset.dmnid;
const safarmarketIdCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('safarmarketId='))
    ?.split('=')[1] || '';

let tripNames = [];



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

/**
 * Event listener for DOM content loaded to initialize the session booking process.
 * Loads data from sessionStorage, sets up UI, and triggers initial actions.
 */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize translation
    await loadTranslations();
    // Initialize direction styles
    await applyDirectionStyles();
    // Initialize dropdowns
    // BirthDate Persian
    generateDays("birth-persian-day-dropdown");
    generateMonths("birth-persian-month-dropdown", false);
    generateYears("birth-persian-year-dropdown", false, false);

    // BirthDate Gregorian
    generateDays("birth-gregorian-day-dropdown");
    generateMonths("birth-gregorian-month-dropdown", true);
    generateYears("birth-gregorian-year-dropdown", true, false);

    // PassportDate Persian
    generateDays("passport-persian-day-dropdown");
    generateMonths("passport-persian-month-dropdown", false);
    generateYears("passport-persian-year-dropdown", false, true);

    // PassportDate Gregorian
    generateDays("passport-gregorian-day-dropdown");
    generateMonths("passport-gregorian-month-dropdown", true);
    generateYears("passport-gregorian-year-dropdown", true, true);
    // Load the request mapping JSON only once and cache it for future use
    await loadRequestMapping();
    // Load and inject the SVG sprite for icons
    fetch("/booking/images/sprite-booking-icons.svg")
      .then((res) => res.text())
      .then((svgText) => {
        const div = document.createElement("div");
        div.style.display = "none"; // Hide the container from view
        div.innerHTML = svgText;
        document.body.insertBefore(div, document.body.firstChild); // Inject the SVG sprite at the beginning of <body>
      })
      .catch((err) => {
        console.error("SVG sprite load error:", err);
      });

    if (sessionStorage.getItem("sessionSearch")) {
      // Parse stored flight search data
      sessionSearchStorage = JSON.parse(
        sessionStorage.getItem("sessionSearch")
      );
      // Initialize selectedMode
      selectedMode = sessionSearchStorage.Type;

      // If booking type is AI, set AI source and update research button
      if (sessionSearchStorage?.Mode === "AI") {
        $bc.setSource("cms.flightAi", [
          {
            TokenId: sessionSearchStorage.TokenId,
            FlightId: sessionSearchStorage.FlightId,
            run: true,
          },
        ]);

        document
          .querySelector(".book-research__btn__container")
          .setAttribute("onclick", "window.location='/book/ai'");
      } else {
        // If not AI, load regular flight booking data
        sessionBookStorage = sessionStorage.getItem("sessionBook")
          ? JSON.parse(sessionStorage.getItem("sessionBook"))
          : "";
        setbusGroup();
      }

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
    }
  } catch (error) {
    // Catch and log any errors that occur during DOMContentLoaded
    console.error("DOMContentLoaded: " + error.message);
  }
});

/**
 * Subsequent calls will return the cached data instead of fetching again.
 */
const loadRequestMapping = async () => {
  // If the data has already been loaded, return it from the cache
  if (requestMappingCache) return requestMappingCache;

  // Fetch the JSON file from the specified path
  const response = await fetch("/json/request");

  // Parse the JSON response into a JavaScript object
  const data = await response.json();

  // Store the data in the cache for future use
  requestMappingCache = data;

  // Return the loaded data
  return data;
};

// const busData = JSON.parse(sessionStorage.getItem("sessionBook")) || {};
// const busGroup = busData.busGroup || [];

// const renderRoutesInfo = async (element) => {
//   try {
//     // Fetch bus data from localStorage

//     const renderBusInfo = (icon, label, value) => {
//       if (value && value !== "") {
//         return `
//                 <div class="book-flex book-items-center book-mb-2">
//                     <div class="book-w-10 book-h-10 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded book-ml-2">
//                         <svg width="25" height="24">
//                             <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
//                         </svg>
//                     </div>
//                     <div>
//                         <p class="book-text-zinc-500 book-my-2">${label}:</p>
//                         <p class="book-text-zinc-900">${value}</p>
//                     </div>
//                 </div>`;
//       }
//       return "";
//     };

//     const routeHtml = async (item, index) => {
//       // Helper functions to resolve location and carrier details
//       // checkk
//       const renderLocation = async (locationId) => {
//         const location = busData.dictionaries?.location?.[locationId] || {};
//         return location.city || "Unknown";
//       };

//       const renderCarrierName = async (carrierCode) => {
//         return busData.dictionaries?.carriers?.[carrierCode]?.name || "Unknown";
//       };

//       return `
//             <div class="book-route__info">
//                 <div class="book-flex book-mb-4">
//                     <div class="book-flex">
//                         <div class="book-bus__details__progress__line book-ml-3 book-mr-3 book-relative">
//                             <svg width="26" height="40" class="book-absolute book--right-3 book-z-10">
//                                 <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
//                             </svg>
//                             <svg width="26" height="40" class="book-absolute book--right-3 book--bottom-3 book-z-10">
//                                 <use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use>
//                             </svg>
//                         </div>
//                         <div class="book-flex book-flex-col book-justify-between book-border-l book-border-zinc-300 book-px-2 book-ml-3">
//                             <div>
//                                 <h5 class="book-text-xl book-font-bold book-text-zinc-900">${
//                                   busGroup[index].originTerminal
//                                 }</h5>
//                                 <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${
//                                   item.departureTime
//                                 }</h5>
//                                 <p class="book-text-zinc-500 book-text-sm book-DepartureDate">${
//                                   item.departureDate
//                                 }</p>
//                             </div>
//                             <div>
//                                 <h5 class="book-text-xl book-font-bold book-text-zinc-900">${
//                                   busGroup[index].destinationTerminal
//                                 }</h5>
//                                 <p class="book-text-zinc-500 book-text-sm">${
//                                   item.arrivalDate || ""
//                                 }</p>
//                             </div>
//                         </div>
//                     </div>
//                     <div class="book-flex">
//                         <div class="book-flex book-flex-col">
//                             <div>
//                                 <h6 class="book-text-xl book-text-zinc-900">${await renderLocation(
//                                   item.originRoute
//                                 )}</h6>
//                                 <p class="book-text-zinc-600 book-text-sm book-my-2">
//                                     ${await renderLocation(
//                                       item.originRoute
//                                     )}, ${
//         busData.dictionaries?.location?.[item.originRoute]?.country || ""
//       }
//                                 </p>
//                                 <div ss="book-flex book-items-center book-gap-2">
//                                     <span class="book-text-zinc-900 book-text-sm">
//                                         ${await renderCarrierName(
//                                           item.busOperatorCode
//                                         )}
//                                     </span>
//                                 </div>
//                             </div>
//                             <div class="book-text-sm book-my-5">
//                                 <div class="">
//                                     ${renderBusInfo(
//                                       "check-circle-icon",
//                                       "نوع اتوبوس",
//                                       item.busType
//                                     )}
//                                     ${renderBusInfo(
//                                       "check-circle-icon",
//                                       "صندلی‌های موجود",
//                                       busGroup[index].availableSeats
//                                     )}
//                                     ${renderBusInfo(
//                                       "check-circle-icon",
//                                       "قابلیت استرداد",
//                                       busGroup[index].refundable
//                                         ? "دارد"
//                                         : "ندارد"
//                                     )}
//                                 </div>
//                             </div>
//                             <div>
//                                 <h6 class="book-text-xl book-text-zinc-900">${await renderLocation(
//                                   item.destinationRoute
//                                 )}</h6>
//                                 <p class="book-text-zinc-600 book-text-sm book-my-2">
//                                     ${await renderLocation(
//                                       item.destinationRoute
//                                     )}, ${
//         busData.dictionaries?.location?.[item.destinationRoute]?.country || ""
//       }
//                                 </p>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>`;
//     };

//     let output = "";
//     for (const bus of busGroup) {
//       const routeHtmls = await Promise.all(
//         (bus.routesInfo || []).map((item, i) => routeHtml(item, i))
//       );
//       output += routeHtmls.join("");
//     }

//     return output;
//   } catch (error) {
//     console.error("renderRoutesInfo: " + error.message);
//     return "";
//   }
// };


// --- NEW BUS (aligned with flight UI) ---

const busData = JSON.parse(sessionStorage.getItem("sessionBook")) || {};
const busGroup = busData.busGroup || [];

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
    const formatDate = async (val) =>
      typeof renderFormatterDate === "function" ? await renderFormatterDate(val) : (val || "");
    const formatDuration = async (mins) =>
      typeof renderFormatterDuration === "function" ? await renderFormatterDuration(mins) : (mins || "");

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
            <!-- ستون زمان‌ها و کدها (هم‌شکل پرواز) -->
            <div class="book-flex book-mb-4 md:book-mb-0 md:book-mr-6">
<div class="book-flight__details__progress__line book-ml-3 book-mr-3 book-relative"><svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-z-10"><use href="/booking/images/sprite-booking-icons.svg#path-icon"></use></svg><svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book--bottom-3 book-z-10"><use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use></svg></div>
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

            <!-- ستون جزئیات (هم‌شکل پرواز) -->
            <div class="book-flex">
              <div class="book-flex book-flex-col">
                <!-- مبدأ -->
                <div>
                  <h6 class="book-text-lg book-text-zinc-900">${originCity}</h6>
                  <p class="book-text-zinc-600 book-text-sm book-my-2">${originCity}${originCountry ? `, ${originCountry}` : ""}</p>
                  <div class="book-flex book-items-center book-gap-2">
                    <span class="book-text-zinc-900 book-text-sm">${carrierName}</span>
                  </div>
                </div>

                <!-- Grid دو ستونه شبیه پرواز -->
                <div class="book-text-sm book-my-5">
                  <div class="book-grid book-grid-cols-2 sm:book-grid-cols-2 book-gap-2">
                    ${renderBusInfo("check-circle-icon", busTypeLabelKey, routeItem.busType)}
                    ${renderBusInfo("check-circle-icon", seatAvailLabelKey, String(bus?.availableSeats ?? ""))}
                    ${renderBusInfo("check-circle-icon", refundableLabelKey, bus?.refundable ? yesLabel : noLabel)}
                    <!-- اگر آیتم دیگری خواستید اضافه کنید در همین Grid بگذارید -->
                  </div>
                </div>

                <!-- مقصد -->
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


/**
 * Formats a date to Persian (Shamsi) format with weekday, day, and month.
 * @param {string} element - The date string to format.
 * @returns {string} Formatted Persian date or empty string on error.
 */
const renderFormatterDate = async (element) => {
  try {
    const gregorianDate = new Date(element);
    const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return formatter.format(gregorianDate);
  } catch (error) {
    console.error("renderFormatterDate: " + error.message);
    return "";
  }
};

/**
 * Formats duration string (e.g., '2h30m') to Persian format.
 * @param {string} str - Duration string to format.
 * @returns {string} Formatted duration or original string on error.
 */
const renderFormatterDuration = (str) => {
  try {
    const match = str.match(/(\d+)h(?:\s*(\d+)m)?/);
    if (!match) return str;

    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;

    let result = `${hours} ساعت`;
    if (minutes > 0) {
      result += ` ${minutes} دقیقه`;
    }

    return result;
  } catch (error) {
    console.error(`renderFormatterDuration: ${error.message}`);
    return str;
  }
};

/**
 * Renders the country name for a given location code.
 * @param {string} element - Location code.
 * @returns {string} Country name or empty string on error.
 */
const renderCountry = async (element) => {
  try {
    const mergedLocation = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.location }),
      {}
    );
    return mergedLocation[element]?.country || "";
  } catch (error) {
    console.error("renderCountry: " + error.message);
    return "";
  }
};

/**
 * Renders an airline logo image.
 * @param {string} element - Airline code.
 * @param {string} heightClass - CSS class for image height.
 * @param {string} width - Image width.
 * @param {string} height - Image height.
 * @param {Object} [item] - Optional route data for multi-airline check.
 * @returns {string} HTML string for airline logo or empty string on error.
 */
const renderAirlineLogo = async (element, heightClass, width, height, item) => {
  try {
    const mergedCarriers = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.carriers }),
      {}
    );
    const carrier = mergedCarriers[element] || { image: "", name: "" };
    const imgTag = `<img class="book-route__airline book-mx-auto book-h-${heightClass}" src="/${carrier.image}" width="${width}" height="${height}" alt="${carrier.name}"/>`;

    if (item?.RoutesInfo?.length > 1) {
      const codes = item.RoutesInfo.map((route) => route.AirlineCode);
      const uniqueCodes = [...new Set(codes)];
      if (uniqueCodes.length > 1) {
        return `<div class="book-multi__airlines">${imgTag}</div>`;
      }
      return imgTag;
    }
    return imgTag;
  } catch (error) {
    console.error("renderAirlineLogo: " + error.message);
    return "";
  }
};

/**
 * Renders codeshare indicator for operating airline.
 * @param {Object} element - Route data containing airline codes.
 * @returns {string} HTML string for codeshare info or empty string.
 */
const renderOperatingAirlineCode = async (element) => {
  try {
    if (element.OperatingAirlineCode) {
      if (element.OperatingAirlineCode !== element.AirlineCode) {
        return `
                <div class="book-text-zinc-600 book-text-sm book-my-2 book-mx-3">
                    <span class="book-mr-1">Operated By</span>
                    <span class="book-mr-1">${
                      element.OperatingAirlineCode
                    }</span><span>(${await renderAirlineName(
          element.OperatingAirlineCode
        )})</span>
                </div>
            `;
      }
    }
    return "";
  } catch (error) {
    console.error("renderOperatingAirlineCode: " + error.message);
    return "";
  }
};

/**
 * Renders the flight class in Persian.
 * @param {string} element - Flight class code.
 * @returns {string} Persian flight class name or default "فرست" on error.
 */
const renderFlightClass = async (element) => {
  try {
    const classMap = {
      economy: "اکونومی",
      businessclass: "بیزینس",
      firstclass: "فرست",
    };
    return classMap[element.toLowerCase()] || "فرست";
  } catch (error) {
    console.error("renderFlightClass: " + error.message);
    return "";
  }
};

/**
 * Renders airline logo based on airline code.
 * @param {string} element - Airline code.
 * @returns {string} HTML string of airline logo or empty string on error.
 */
const renderAirlineCode = async (element) => {
  try {
    const mergedCarriers = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.carriers }),
      {}
    );
    return `<img src="/${mergedCarriers[element].image}" width="70" height="28" alt="${mergedCarriers[element].name}"/>`;
  } catch (err) {
    console.error(
      `renderAirlineCode: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return "";
  }
};

/**
 * Renders the airline name for a given airline code.
 * @param {string} element - Airline code.
 * @returns {string} Airline name or empty string on error.
 */
const renderAirlineName = async (element) => {
  try {
    const mergedCarriers = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.carriers }),
      {}
    );
    return mergedCarriers[element]?.name || "";
  } catch (error) {
    console.error("renderAirlineName: " + error.message);
    return "";
  }
};

/**
 * Renders baggage information.
 * @param {Object} element - Baggage data.
 * @param {string} [style] - Optional CSS style for baggage info.
 * @returns {string} HTML string for baggage info or empty string on error.
 */
const renderBaggages = async (element, style) => {
  try {
    if (Number(element?.Baggage) === 0) {
      return `<span class="book-baggage__info ${
        style ? "book-font-bold" : ""
      }">بدون بار</span>`;
    }
    const baggageHTML = `
            <span class="book-baggage__info ${
              style ? "book-relative book-top-[2px] book-font-bold" : ""
            }">
                ${element.Baggage}
                <span class="book-ml-1">${element.Unit || ""}</span>
            </span>
        `;
    return baggageHTML.trim();
  } catch (error) {
    console.error("renderBaggages: " + error.message);
    return "";
  }
};

/**
 * Renders connection time for a route stop.
 * @param {Object} element - Route data with connection time.
 * @returns {string} HTML string for connection time or empty string.
 */
const renderConnectionTimeRoute = async (element) => {
  try {
    if (element?.ConnectionTime > 0) {
      const hours = Math.floor(element.ConnectionTime / 60);
      const minutes = element.ConnectionTime % 60;
      return `
                <div class="book-my-10 book-flex book-text-zinc-800 book-text-sm book-justify-between book-bg-zinc-100 book-rounded-xl book-p-3">
            <div class="book-flex book-gap-1">
                <svg width="15" height="16">
                            <use href="/booking/images/sprite-booking-icons.svg#hourglass-icon"></use>
                </svg>
                <span>مدت توقف: ${hours} ساعت و ${minutes} دقیقه</span>
            </div>
            <div>
                (${element.DestinationAirport})
                ${await renderAirport(element.DestinationAirport)}
            </div>
        </div>`;
    }
    return "";
  } catch (error) {
    console.error("renderConnectionTimeRoute: " + error.message);
    return "";
  }
};

/**
 * Renders the city name for a given location code.
 * @param {string} element - Location code.
 * @returns {string} City name or empty string on error.
 */
const renderCity = async (element) => {
  try {
    const mergedLocation = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.location }),
      {}
    );
    return mergedLocation[element]?.city || "";
  } catch (error) {
    console.error("renderCity: " + error.message);
    return "";
  }
};

/**
 * Renders airport name based on airport code.
 * @param {string} element - Airport code.
 * @returns {string} Airport name or empty string on error.
 */
const renderAirport = async (element) => {
  try {
    const mergedLocation = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.location }),
      {}
    );
    return mergedLocation[element].airport;
  } catch (err) {
    console.error(
      `renderAirport: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return "";
  }
};

/**
 * Renders fare rules as title-text pairs.
 * @param {Array} element - Array of fare rule objects.
 * @returns {string} HTML string of fare rules or empty string on error.
 */
const renderRule = async (element) => {
  try {
    let output = "";
    for (const item of element || []) {
      output += `
                <div class="book-text-sm">
            <div class="book-text-zinc-600 book-mb-1">${item.title}:</div>
            <div>${item.text}</div>
        </div>`;
    }
    return output;
  } catch (error) {
    console.error("renderRule: " + error.message);
    return "";
  }
};

/**
 * Renders passenger fare details (base fare, tax, unit, total).
 * @param {Object} element - Booking data with price information.
 * @returns {string} HTML string of passenger fare details or empty string on error.
 */
const renderPassengerFare = async (element) => {
  try {
    // Fetch bus data from localStorage
    const busData = JSON.parse(sessionStorage.getItem("sessionBook")) || {};
    const priceInfo = busData.priceInfo || {};
    const passengerFare = priceInfo.passengerFare || [];

    let output = "";
    const passengerMap = {
      Adult: "بزرگسال",
      Child: "کودک",
      Infant: "نوزاد",
    };

    for (const item of passengerFare) {
      const passengerType =
        passengerMap[item.passengerType] || item.passengerType;
      if (item.count > 0) {
        output += `<ul>
                <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                    <span>قیمت پایه</span>
                    <span>${new Intl.NumberFormat("fa-IR")
                      .format(item.baseFare)
                      .replace(/,/g, "/")}${await renderCurrency(
          priceInfo.currency
        )}</span>
                </li>
                <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                    <span>مالیات و عوارض</span>
                    <span>${new Intl.NumberFormat("fa-IR")
                      .format(item.tax)
                      .replace(/,/g, "/")}${await renderCurrency(
          priceInfo.currency
        )}</span>
                </li>
                <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                    <span>هر ${passengerType}</span>
                    <span>${new Intl.NumberFormat("fa-IR")
                      .format(item.unit)
                      .replace(/,/g, "/")}${await renderCurrency(
          priceInfo.currency
        )}</span>
                </li>
                <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                    <span>مجموع </span>
                    <span>${new Intl.NumberFormat("fa-IR")
                      .format(item.total)
                      .replace(/,/g, "/")}${await renderCurrency(
          priceInfo.currency
        )}</span>
                </li>
            </ul>`;
      }
    }
    return output;
  } catch (error) {
    console.error("renderPassengerFare: " + error.message);
    return "";
  }
};

/**
 * Renders currency symbol or value based on currency code.
 * @param {string} element - Currency code.
 * @param {string} [type] - Optional type ('input' for raw value, else HTML span).
 * @returns {string} Currency value or HTML span with symbol, or empty string on error.
 */
const renderCurrency = async (element, type) => {
  try {
    const mergedCurrency = dictionaries.reduce(
      (acc, item) => ({ ...acc, ...item.currency }),
      {}
    );
    if (type === "input") {
      return mergedCurrency[element]; // Return raw currency value
    }
    return `<span class="book-text-xs book-mr-1">${mergedCurrency[element]}</span>`; // Return HTML span with symbol
  } catch (err) {
    console.error(
      `renderCurrency: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return "";
  }
};

/**
 * Renders API list data by updating UI elements after processing.
 * Sets the data-run attribute and hides the loader.
 */
const renderListApi = async () => {
  try {
    const apiContainer = document.querySelector(".book-rendering__list__api");
    // Set data-run attribute to indicate processing completion
    apiContainer.querySelector(".book-api__load").setAttribute("data-run", "1");
    // Hide the loader if it exists
    const loader = apiContainer.querySelector(".book-drop__loader__content");
    if (loader) {
      loader.classList.add("book-hidden");
    }
  } catch (err) {
    console.error(
      `renderListApi: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Renders API info data by updating UI elements after processing.
 * Hides the loader and removes the rendering class.
 */
const renderInfoApi = async () => {
  try {
    const apiContainer = document.querySelector(".book-rendering__info__api");
    // Hide the loader
    apiContainer
      .querySelector(".book-api__container__loader")
      .classList.add("book-hidden");
    // Remove the rendering class to reset state
    apiContainer.classList.remove("book-rendering__info__api");
  } catch (err) {
    console.error(
      `renderInfoApi: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Initiates coupon code validation by triggering an API call.
 * Shows the loader and sends coupon data.
 * @param {HTMLElement} element - Button element triggering the coupon check.
 */
const renderCheckCoupon = async (element) => {
  try {
    const container = element.closest(".book-api__container__content");
    const loader = container.querySelector(".book-api__container__loader");
    // Get coupon code from input
    const couponCode = container.querySelector(".book-coupon__code").value;
    // Get account type from buyers container
    const accountType = document.querySelector(".book-buyers__container")
      .dataset.accounttype;
    // Get first pay amount, removing commas
    const firstPay = document
      .querySelector(".book-firstpay__cost")
      .textContent.replace(/,/g, "");
    // Use totalcom cost if available, else fallback to firstPay
    const totalComElement = document.querySelector(".book-totalcom__cost");
    const price = totalComElement
      ? totalComElement.textContent.replace(/,/g, "")
      : firstPay.replace(/,/g, "");

    // Show the loader
    loader.classList.remove("book-hidden");
    let cookieValue = `; ${document.cookie}`;
    let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
    let rkey = match ? match[1] : null;
    const { requests, productGroupField, productIdField } =
      getServiceMappingInfo(selectedMode);
    const checkCouponUrl = requests.checkCoupon;
    // Trigger API call to check coupon
    $bc.setSource("cms.checkCoupon", [
      {
        SessionId: sessionSearchStorage.SessionId,
        Group: JSON.stringify(sessionBookStorage.busGroup),
        Id: sessionBookStorage.busId,
        selectedMode: selectedMode,
        accountType,
        price,
        firstPay,
        couponCode,
        rkey: rkey,
        url: checkCouponUrl,
        productIdField: productIdField,
        productGroupField: productGroupField,
        run: true,
      },
    ]);
  } catch (err) {
    console.error(
      `renderCheckCoupon: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Renders counter selection UI after data is processed.
 * Sets the data-run attribute and hides the loader.
 */
const renderCounter = async () => {
  try {
    const counterContainer = document.querySelector(".book-counter__container");
    // Set data-run attribute to indicate processing completion
    counterContainer.querySelector("input").setAttribute("data-run", "1");
    // Hide the loader if it exists
    const loader = counterContainer.querySelector(
      ".book-drop__loader__content"
    );
    if (loader) {
      loader.classList.add("book-hidden");
    }
  } catch (err) {
    console.error(
      `renderCounter: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Renders company rules UI after data is processed.
 * Sets the data-run attribute on the input.
 */
const renderCompanyRule = async () => {
  try {
    // Set data-run attribute to indicate processing completion
    document
      .querySelector(".book-company__rule__container input")
      .setAttribute("data-run", "1");
  } catch (err) {
    console.error(
      `renderCompanyRule: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Renders the bank list by updating invoice content with the first pay cost and removing the loader.
 * @param {HTMLElement} element - The element triggering the rendering (not used in the function).
 */
const renderBankList = async (element) => {
  try {
    // Update all invoice content elements with the first pay cost
    document.querySelectorAll(".book-invoice__content").forEach((e) => {
      const firstPayCost = e.querySelector(".book-firstpay__cost");
      if (firstPayCost) {
        // Set the first pay cost text to match the value in the first pay container
        firstPayCost.textContent = document.querySelector(
          ".book-firstpay__container .book-firstpay__cost"
        ).textContent;
      }
      const unit = document
        .querySelector(".book-unit__content")
        .querySelector("span");
      const unitDisplay = document.querySelector(".book-unit__display");
      if (unitDisplay) unitDisplay.textContent = unit.textContent;
    });

    // Remove the API loader if it exists
    const loader = document.querySelector(
      ".book-invoice__container .book-api__container__loader"
    );
    if (loader) {
      loader.remove();
    }
  } catch (err) {
    console.error(
      `renderBankList: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
/**
 * Renders the flight search UI based on stored flight group data.
 * Updates cabin class, flight type, passenger summary, and trip details in the UI.
 */
const renderResearch = async () => {
  try {
    // Validate sessionStorage data
    if (!sessionSearchStorage || !sessionSearchStorage.SchemaId) {
      throw new Error("Missing SchemaId in sessionSearchStorage");
    }
    if (
      !sessionBookStorage ||
      !sessionBookStorage.FlightGroup ||
      !sessionBookStorage.PriceInfo
    ) {
      throw new Error("Invalid or missing data in sessionBookStorage");
    }

    schemaId = sessionSearchStorage.SchemaId;

    // Update cabin class display
    const cabinClass = document.querySelector(
      ".book-cabinClass__searched__content"
    );
    if (!cabinClass) {
      throw new Error("Cabin class element not found");
    }

    const cabinMap = {
      Economy: { text: "اکونومی", class: "Economy" },
      BusinessClass: { text: "بیزینس", class: "BusinessClass" },
      FirstClass: { text: "فرست", class: "FirstClass" },
    };
    const flightClass = sessionBookStorage.FlightGroup[0].Class;
    const cabin = cabinMap[flightClass] || {
      text: "اکونومی",
      class: "Economy",
    }; // Fallback to Economy
    cabinClass.textContent = cabin.text;
    cabinClass.dataset.class = cabin.class;

    // Update flight type selection
    const flightTypes = document.querySelectorAll(
      ".book-module__flight__type li"
    );
    if (flightTypes.length < 3) {
      throw new Error("Flight type elements not found or insufficient");
    }
    flightTypes.forEach((item) =>
      item.classList.remove("book-active__module__flight__type")
    );
    const typeIndex = { 291: 0, 290: 1, 292: 2 }[schemaId];
    if (flightTypes[typeIndex]) {
      flightTypes[typeIndex].classList.add("book-active__module__flight__type");
    } else {
      console.warn(
        `Invalid schemaId: ${schemaId}, defaulting to first flight type`
      );
      flightTypes[0].classList.add("book-active__module__flight__type");
    }

    // Update passenger summary
    const passengerItems = document.querySelectorAll(
      ".book-passenger__searched__items li"
    );
    const passengerCountInput = document.querySelector(
      ".book-passenger__count"
    );
    if (passengerItems.length < 3 || !passengerCountInput) {
      throw new Error("Passenger items or count input not found");
    }

    const passengerFare = sessionBookStorage.PriceInfo.PassengerFare;
    const passengerParts = [];
    if (passengerFare[0].Count > 0)
      passengerParts.push(`${passengerFare[0].Count} بزرگسال`);
    if (passengerFare[1].Count > 0)
      passengerParts.push(`${passengerFare[1].Count} کودک`);
    if (passengerFare[2].Count > 0)
      passengerParts.push(`${passengerFare[2].Count} نوزاد`);
    const passengerSummary = passengerParts.join(" / ") || "1 بزرگسال"; // Fallback
    passengerCountInput.value = passengerSummary;

    passengerItems[0].querySelector(".book-passenger__count__value").innerHTML =
      passengerFare[0].Count || 0;
    passengerItems[1].querySelector(".book-passenger__count__value").innerHTML =
      passengerFare[1].Count || 0;
    passengerItems[2].querySelector(".book-passenger__count__value").innerHTML =
      passengerFare[2].Count || 0;

    // Update passenger UI for single adult case
    if (
      passengerFare[0].Count === 1 &&
      passengerFare[1].Count === 0 &&
      passengerFare[2].Count === 0
    ) {
      updateBookPassengerUI(); // Assumed to be defined elsewhere
    }

    // Update trip details
    if (sessionBookStorage.FlightGroup.length === 0) {
      throw new Error("No flight group data available");
    }

    const departureLocationName = document.querySelector(
      ".departure__location__name"
    );
    const arrivalLocationName = document.querySelector(
      ".arrival__location__name"
    );
    const departureDate = document.querySelector(".departure__date");
    const arrivalDate = document.querySelector(".arrival__date");
    const arrivalDateContainer = document.querySelector(
      ".arrival__date__container"
    );
    if (
      !departureLocationName ||
      !arrivalLocationName ||
      !departureDate ||
      !arrivalDate ||
      !arrivalDateContainer
    ) {
      throw new Error("Trip detail elements not found");
    }

    const flightGroup = sessionBookStorage.FlightGroup;
    const lastIndex = flightGroup.length - 1;

    if (schemaId === 291) {
      // One-way trip
      departureLocationName.value =
        (await renderCity(flightGroup[0].Origin)) || "";
      arrivalLocationName.value =
        (await renderCity(flightGroup[lastIndex].Destination)) || "";
      departureLocationName.dataset.id = flightGroup[0].Origin;
      arrivalLocationName.dataset.id = flightGroup[lastIndex].Destination;
      departureDate.value =
        convertToPersianDate(flightGroup[0].DepartureDate) || "";
      departureDate.dataset.date = flightGroup[0].DepartureDate || "";
    } else if (schemaId === 290) {
      // Round-trip
      departureLocationName.value =
        (await renderCity(flightGroup[0].Origin)) || "";
      arrivalLocationName.value =
        (await renderCity(flightGroup[lastIndex].Destination)) || "";
      departureLocationName.dataset.id = flightGroup[0].Origin;
      arrivalLocationName.dataset.id = flightGroup[lastIndex].Destination;
      departureDate.value =
        convertToPersianDate(flightGroup[0].DepartureDate) || "";
      departureDate.dataset.date = flightGroup[0].DepartureDate || "";
      arrivalDate.value =
        convertToPersianDate(flightGroup[lastIndex].ArrivalDate) || "";
      arrivalDate.dataset.date = flightGroup[lastIndex].ArrivalDate || "";
      arrivalDateContainer.classList.remove("disabled__date__container");
    } else {
      // Multi-city trip
      const container = document.querySelector("#route__template");
      if (!container) {
        throw new Error("Route template container not found");
      }
      const templateHTML = container.innerHTML;
      container.innerHTML = "";

      for (let index = 0; index < flightGroup.length; index++) {
        const trip = flightGroup[index];
        const tripClone = document.createElement("div");
        tripClone.innerHTML = templateHTML.trim();
        const tripElement = tripClone.firstElementChild;

        // Add trip name
        const tripNameDiv = document.createElement("div");
        tripNameDiv.classList.add("route__name", "book-text-sm", "book-mb-1");
        tripNameDiv.textContent = `مسیر ${tripNames[index] || index + 1}`; // Fallback to index
        tripElement.insertAdjacentElement("afterbegin", tripNameDiv);

        // Update trip details
        const depInput = tripElement.querySelector(
          ".departure__location__name"
        );
        const arrInput = tripElement.querySelector(".arrival__location__name");
        const depDate = tripElement.querySelector(".departure__date");
        const arrDateContainer = tripElement.querySelector(
          ".arrival__date__container"
        );
        if (!depInput || !arrInput || !depDate || !arrDateContainer) {
          throw new Error("Trip element inputs not found");
        }

        depInput.value = (await renderCity(trip.Origin)) || "";
        arrInput.value = (await renderCity(trip.Destination)) || "";
        depInput.dataset.id = trip.Origin;
        arrInput.dataset.id = trip.Destination;
        depDate.value = convertToPersianDate(trip.DepartureDate) || "";
        depDate.dataset.date = trip.DepartureDate || "";
        arrDateContainer.classList.add("book-hidden");

        // Add delete button for trips 3 and 4
        if (index === 2 || index === 3) {
          const deleteButton = document.createElement("button");
          deleteButton.textContent = "حذف";
          deleteButton.type = "button";
          deleteButton.classList.add(
            "route__delete",
            "book-bg-red-500",
            "book-text-sm",
            "book-text-white",
            "book-px-2",
            "book-py-1",
            "book-rounded",
            "book-left-5",
            "book-top-0",
            "book-absolute"
          );
          deleteButton.onclick = () => deleteRoute(deleteButton); // Assumed to be defined elsewhere
          tripElement.appendChild(deleteButton);
        }

        container.appendChild(tripElement);
      }

      // Update container styling for multi-city trips
      container.classList.remove("book-w-3/5");
      container.classList.add("book-grid", "book-grid-cols-2", "book-gap-4");
      container
        .querySelectorAll(".book-min-w-48")
        .forEach((e) => e.classList.remove("book-min-w-48"));
      container
        .querySelectorAll(".departure__date__container")
        .forEach((e) => e.classList.add("book-w-11/12"));
      const addRouteContainer = document.querySelector(
        ".book__add__roue__container"
      );
      if (addRouteContainer) {
        addRouteContainer.classList.remove("book-hidden");
      }
    }
  } catch (err) {
    console.error(
      `renderResearch: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
/**
 * Updates the passenger UI with current counts and button states.
 */
const updateBookPassengerUI = () => {
  try {
    const items = document.querySelectorAll(
      ".book-passenger__searched__items li"
    );
    const totalInput = document.querySelector(".book-passenger__count");

    // Build passenger summary
    const passengerParts = [];
    if (adultsCount > 0) passengerParts.push(`${adultsCount} بزرگسال`);
    if (childrenCount > 0) passengerParts.push(`${childrenCount} کودک`);
    if (infantsCount > 0) passengerParts.push(`${infantsCount} نوزاد`);
    totalInput.value = passengerParts.join(" / ");

    // Update each passenger type UI
    items.forEach((li) => {
      const type = li.dataset.type;
      const countSpan = li.querySelector(".book-passenger__count__value");
      const plusBtn = li.querySelector(".book-plus");
      const minusBtn = li.querySelector(".book-minus");

      let count,
        min = 0,
        max = MAX_PER_TYPE;
      if (type === "adult") {
        count = adultsCount;
        min = 1;
        max = Math.min(MAX_PER_TYPE, MAX_TOTAL - childrenCount - infantsCount);
      } else if (type === "child") {
        count = childrenCount;
        max = Math.min(MAX_PER_TYPE, MAX_TOTAL - adultsCount - infantsCount);
      } else if (type === "infant") {
        count = infantsCount;
        max = Math.min(adultsCount, MAX_PER_TYPE);
      }

      countSpan.textContent = count;
      plusBtn.style.pointerEvents = count >= max ? "none" : "auto";
      plusBtn.style.opacity = count >= max ? "0.3" : "1";
      minusBtn.style.pointerEvents = count <= min ? "none" : "auto";
      minusBtn.style.opacity = count <= min ? "0.3" : "1";
    });
  } catch (error) {
    console.error("updateBookPassengerUI: " + error.message);
  }
};
/**
 * Toggles the visibility of a service table section and updates the UI for route headers.
 * @param {HTMLElement} element - The element triggering the toggle (e.g., route header).
 * @param {string} serviceItemId - The ID of the service section to show.
 */
const toggleServiceTable = (element, serviceItemId) => {
  try {
    // Get all service sections and route buttons within the services content
    const servicesContent = element.closest(".book-services__content");
    const allServices = servicesContent?.querySelectorAll(
      ".book-route__service"
    );
    const allRouteButtons = servicesContent?.querySelectorAll(
      ".book-active__roue__excessService"
    );

    // Hide all service sections
    allServices?.forEach((item) => item.classList.add("book-hidden"));

    // Remove active class from all route headers and set arrow icon to "up"
    allRouteButtons?.forEach((btn) => {
      btn.classList.remove("book-active__roue__excessService");
      const iconUse = btn
        .querySelector(".book-arrow__icon")
        ?.querySelector("svg:last-of-type use");
      if (iconUse) {
        iconUse.setAttribute(
          "href",
          "/booking/images/sprite-booking-icons.svg#up-arrow-icon"
        );
      }
    });

    // Show the selected service section
    const currentItem = document.getElementById(serviceItemId);
    if (currentItem) {
      currentItem.classList.remove("book-hidden");

      // Add active class to the selected route header
      element.classList.add("book-active__roue__excessService");

      // Change arrow icon to "down"
      const iconUse = element
        .querySelector(".book-arrow__icon")
        ?.querySelector("svg:last-of-type use");
      if (iconUse) {
        iconUse.setAttribute(
          "href",
          "/booking/images/sprite-booking-icons.svg#down-arrow-icon"
        );
      }
    } else {
      throw new Error(`Service item with ID ${serviceItemId} not found`);
    }
  } catch (err) {
    console.error(
      `toggleServiceTable: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
/**
 * Toggles the arrow icon between up and down states.
 * @param {HTMLElement} element - The SVG element containing the icon.
 */
const toggleReserveArrowIcon = (element) => {
  try {
    if (!element) return;
    const href =
      element.getAttribute("href") || element.getAttribute("xlink:href") || "";
    const newIcon = href.includes("#down-arrow-icon")
      ? "up-arrow-icon"
      : "down-arrow-icon";
    element.setAttribute(
      "href",
      `/booking/images/sprite-booking-icons.svg#${newIcon}`
    );
  } catch (error) {
    console.error("toggleReserveArrowIcon: " + error.message);
  }
};

/**
 * Toggles API content visibility, clears radio inputs, and triggers data fetch if needed.
 * @param {HTMLElement} element - Trigger element (e.g., checkbox or button).
 * @param {string} type - API type for the data fetch.
 * @param {string} idToFind - Flight ID for the API call.
 * @param {string} renderingClass - Class to add/remove for rendering state.
 */
const toggleContentApi = (element, type, parent, fromScroll = false) => {
  try {
    // Remove rendering class from any existing active container
    const renderingContainer = document.querySelector(
      ".book-api__container__rendering"
    );
    if (renderingContainer) {
      renderingContainer.classList.remove("book-api__container__rendering");
    }

    // Determine content selector based on parent
    const contentSelector =
      parent === "book-services__container"
        ? ".book-api__content"
        : ".book-api__container__content";
    const apiContainer = element.closest(`.${parent}`);
    const content = apiContainer.querySelector(contentSelector);
    const arrow = apiContainer.querySelector(".book-api__container__arrow use");

    // Toggle content visibility based on scroll or click
    if (fromScroll) {
      if (content.classList.contains("book-hidden")) {
        content.classList.remove("book-hidden");
      }
    } else {
      content.classList.toggle("book-hidden");
    }

    // Toggle arrow icon if it exists
    if (arrow) toggleReserveArrowIcon(arrow);

    // Handle special services container logic
    if (parent === "book-services__container") {
      // Trigger baggageService tab on first run
      if (element.dataset.run === "0") {
        const baggageButton = apiContainer.querySelector(
          'button[onclick*="baggageService"]'
        );
        if (baggageButton) {
          selectServiceTab(baggageButton, "baggageService", "ExcessService");
        }
        element.setAttribute("data-run", "1");
      }
    } else {
      // Fetch rules on first run if loader exists for other containers
      if (
        element.dataset.run === "0" &&
        apiContainer.querySelector(".book-api__container__loader")
      ) {
        content.classList.add("book-api__container__rendering");
        let cookieValue = `; ${document.cookie}`;
        let cookieParts = cookieValue.split(`; rkey=`); // Split cookie to extract 'rkey'

        $bc.setSource("cms.rule", {
          SessionId: sessionSearchStorage.SessionId,
          dmnid: sessionSearchStorage.dmnid,
          busId: sessionBookStorage.busId,
          busGroup: JSON.stringify(sessionBookStorage.busGroup),
          rkey: cookieParts[1],
          lid: 1,
          run: true,
        });
        element.setAttribute("data-run", "1");
      }
    }
  } catch (error) {
    console.error("toggleContentApi: " + error.message);
  }
};

/**
 * Toggles passenger type fields (internal/external) and updates UI.
 * @param {HTMLElement} element - Radio input element triggering the toggle.
 * @param {string} add - Passenger type to show (e.g., 'domestic').
 * @param {string} remove - Passenger type to hide (e.g., 'international').
 */
const togglePassengerType = (element, add, remove) => {
  try {
    const passengerContainer = element.closest(".book-passenger__container");

    // Show fields for the added type and mark as required
    passengerContainer
      .querySelectorAll(`.book-internal__${add}`)
      .forEach((e) => {
        e.querySelectorAll(".book-check-required").forEach((ie) => {
          ie.classList.add("book-Required");
        });
        e.classList.remove("book-hidden");
      });

    // Hide fields for the removed type and clear required status
    passengerContainer
      .querySelectorAll(`.book-internal__${remove}`)
      .forEach((e) => {
        e.querySelectorAll(".book-check-required").forEach((ie) => {
          ie.classList.remove("book-Required");
        });
        e.classList.add("book-hidden");
      });

    // Check the selected radio input
    element.querySelector("input[type=radio]").checked = true;

    // Update date dropdown items for DateOfBirth field
    passengerContainer
      .querySelector(".book-DateOfBirth")
      .closest(".book-date__item__container")
      .querySelectorAll(".book-drop__item__content")
      .forEach((e) => {
        e.querySelectorAll("li").forEach((ie) => {
          if (ie.getAttribute("data-switch")) {
            const dataSwitch = ie.getAttribute("data-switch");
            const dataValue = ie.getAttribute("data-value");
            // Update text content with the new data-switch value
            ie.textContent = dataSwitch;
            // Update dataset id if year dropdown
            if (
              ie
                .closest(".book-date__item__content")
                .querySelector(".book-year")
            ) {
              ie.dataset.id = dataSwitch;
            }
            // Swap data-switch and data-value attributes
            ie.setAttribute("data-switch", dataValue);
            ie.setAttribute("data-value", dataSwitch);
          }
        });
      });
  } catch (err) {
    console.error(
      `togglePassengerType: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Toggles visibility of two elements by showing one and hiding the other.
 * @param {string} showClass - CSS class of the element to show.
 * @param {string} hideClass - CSS class of the element to hide.
 */
const toggleVisibility = (showSelector, hideSelector) => {
  try {
    const showElement = document.querySelector(showSelector);
    const hideElement = document.querySelector(hideSelector);

    if (hideElement) hideElement.classList.add("book-hidden");
    if (showElement) showElement.classList.remove("book-hidden");
  } catch (err) {
    console.error(`toggleVisibility: ${err.message}`);
  }
};

/**
 * Toggles dropdown item visibility and triggers data load if needed.
 * @param {HTMLElement} element - Input element triggering the dropdown.
 * @param {string} type - Container class type (e.g., 'code__item__container').
 * @param {string} [load] - Optional API load identifier (e.g., 'dataSource').
 */
const toggleDropItem = (element, type, load) => {
  try {
    // Reset input attributes
    element.setAttribute("data-id", "");
    element.value = "";

    // Close all other dropdowns
    document.querySelectorAll(".book-drop__item__content").forEach((e) => {
      e.classList.remove("book-drop__item__content-toggle");
    });

    // Show all list items in the target dropdown
    const dropContainer = element.closest(`.${type}`);
    dropContainer
      .querySelector(".book-drop__item__content")
      .querySelectorAll("li")
      .forEach((e) => {
        e.classList.remove("book-hidden");
      });

    // Toggle the target dropdown visibility
    dropContainer
      .querySelector(".book-drop__item__content")
      .classList.toggle("book-drop__item__content-toggle");

    // Trigger data load if specified and not yet run
    if (load && !element.getAttribute("data-run")) {
      // Set positioning for loader based on container type
      let left = "book-left-12";
      let top = "book-top-7";
      if (
        element.closest(".book-code__item__container") ||
        element.closest(".book-counter__container")
      ) {
        left = "book-left-9";
        top = "book-top-2.5";
      }
      // Insert loader HTML
      element.insertAdjacentHTML(
        "afterend",
        `<span class="book-drop__loader__content book-absolute ${top} ${left}">
                    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#000" width="18" height="18">
                        <g fill="none" fill-rule="evenodd">
                            <g transform="translate(1 1)" stroke-width="2">
                                <circle stroke-opacity=".5" cx="18" cy="18" r="18"></circle>
                                <path d="M36 18c0-9.94-8.06-18-18-18">
                                    <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite"></animateTransform>
                                </path>
                            </g>
                        </g>
                    </svg>
                </span>`
      );
      // Trigger API call
      $bc.setSource(`cms.${load}`, true);
      // Add rendering class if in API container
      if (element.closest(".book-api__container")) {
        element
          .closest(".book-api__container")
          .classList.add("book-rendering__list__api");
      }
    }
  } catch (err) {
    console.error(
      `toggleDropItem: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Toggles company rules modal visibility and triggers data load if needed.
 * @param {HTMLElement} element - Element triggering the toggle (e.g., checkbox).
 */
// const toggleCompanyRule = (element) => {
//   try {
//     const ruleContainer = element.closest(".book-company__rule__container");
//     // Toggle modal visibility if it exists
//     ruleContainer
//       .querySelector(".book-modal__container")
//       ?.classList.toggle("book-hidden");
//     const checkbox = ruleContainer.querySelector("input[type=checkbox]");
//     // Trigger API call if not yet run
//     if (checkbox.getAttribute("data-run") === "0") {
//       $bc.setSource("cms.companyRules", true);
//       checkbox.setAttribute("data-run", "1");
//     }
//   } catch (err) {
//     console.error(
//       `toggleCompanyRule: ${err.message}, Line: ${err.lineNumber || "unknown"}`
//     );
//   }
// };


const toggleCompanyRule = (element) => {
    try {
        const ruleContainer = element.closest(".book-company__rule__container");
        // Toggle modal visibility if it exists
        ruleContainer.querySelector(".book-modal__container")?.classList.toggle("book-hidden");
        const checkbox = ruleContainer.querySelector("input[type=checkbox]");
        // Trigger API call if not yet run
        if (checkbox.getAttribute("data-run") === "0") {
            $bc.setSource("cms.companyRules", true);
            checkbox.setAttribute("data-run", "1");
        }
    } catch (err) {
        console.error(`toggleCompanyRule: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Toggles the visibility of a select item content element.
 * @param {HTMLElement} element - The element triggering the toggle (e.g., a button or link).
 */
const toggleSelectItem = (element) => {
  try {
    // Find the select item content within the closest container
    const selectItemContent = element
      .closest(".book-select__item__container")
      .querySelector(".book-select__item__content");

    // Toggle visibility by adding or removing the hidden class
    if (selectItemContent.classList.contains("book-hidden")) {
      selectItemContent.classList.remove("book-hidden");
    } else {
      selectItemContent.classList.add("book-hidden");
    }
  } catch (err) {
    console.error(
      `toggleSelectItem: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Processes coupon API response, updates UI with messages, and adjusts prices.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedCheckCoupon = async (args) => {
  try {
    const response = args.response;
    if (response.status === 200) {
      const responseJson = await response.json();
      const couponContainer = document.querySelector(".book-coupon__container");
      if (!couponContainer) throw new Error("Coupon container not found");

      // Hide loader
      const loader = couponContainer.querySelector(
        ".book-api__container__loader"
      );
      if (loader) loader.classList.add("book-hidden");

      const responseElement = couponContainer.querySelector(
        ".book-api__container__reponse"
      );
      if (!responseElement) throw new Error("Response element not found");

      if (responseJson) {
        // Handle coupon response codes
        if (Number(responseJson.code) === 1) {
          responseElement.textContent = `مبلغ محصول کمتر از مبلغ کوپن است`;
          updatePrices(); // Assumed to be defined elsewhere
        } else if (Number(responseJson.code) === 2) {
          responseElement.textContent = `کد کوپن شما برای این محصول وجود ندارد`;
          updatePrices(); // Assumed to be defined elsewhere
        } else if (Number(responseJson.code) === 3) {
          responseElement.textContent = `کوپنی با این اطلاعات وجود ندارد`;
          updatePrices(); // Assumed to be defined elsewhere
        } else if (Number(responseJson.code) === 4) {
          responseElement.textContent = `کد کوپن استفاده شده است`;
          updatePrices(); // Assumed to be defined elsewhere
        } else {
          // Handle valid coupon
          if (responseJson.coupon_price?.unit === "percent") {
            responseElement.innerHTML = `<span>کوپن شما شامل <span>${responseJson.coupon_price.cost}</span> درصد تخفیف است</span>`;
            updatePrices(
              responseJson.buy_price?.cost,
              responseJson.buy_price?.firstpay
            ); // Assumed to be defined elsewhere
          } else {
            // Non-percent unit case (currently empty as per original)
          }
        }
      }
    }
  } catch (err) {
    console.error(
      `onProcessedCheckCoupon: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

// Process bus API rules for rendering bus rules, baggage, and services
// const onProcessedbusApiRule = async (args) => {
//     try {
//         // Validate response
//         const { response } = args;
//         if (!response || response.status !== 200) return;

//         // Parse JSON response
//         const responseJson = await response.json();
//         if (!responseJson) return;

//         // Get main rendering container
//         const renderingContainer = document.querySelector(".book-api__container__rendering");
//         if (!renderingContainer) return;

//         // Helper function to create container if it doesn't exist
//         const ensureContainer = (parent, className) => {
//             let container = parent.querySelector(`.${className}`);
//             if (!container) {
//                 container = document.createElement("div");
//                 container.className = className;
//                 parent.appendChild(container);
//             }
//             return container;
//         };

//         // Render bus rules if available
//         if (responseJson.busRules) {
//             if (responseJson.busRules.length > 0) {
//                 let output = "";
//                 for (const item of responseJson.busRules) {
//                     if (item.Rule?.length > 0) {
//                         output += `
//                     <div class="book-text-zinc-900 book-text-sm book-text-justify book-ltr">
//                 <div class="book-mb-2 book-flex book-gap-1">
//                     <span>${item.From}</span>
//                     <svg width="24" height="24">
//                         <use href="/booking/images/sprite-booking-icons.svg#right-arrow-icon"></use>
//                     </svg>
//                     <span>${item.To}</span>
//                 </div>
//                 <div>${await renderRule(item.Rule)}</div>
//             </div>`;
//                     } else {
//                         renderingContainer.innerHTML = "قوانینی در دسترس نیست";
//                     }
//                 }
//                 renderingContainer.innerHTML = output || "قوانینی در دسترس نیست";
//             } else {
//                 renderingContainer.innerHTML = "قوانینی در دسترس نیست";
//             }
//         }
//           // Create or get service containers dynamically
//             renderingContainer.querySelector(".book-api__container__loader")?.remove();

//     } catch (err) {
//         // Log error and show fallback message
//         console.error(`onProcessedbusApiRule: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
//     }
// };

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

// Update passenger table with selected baggage
const updatePassengerTable = async (
  element,
  tableId,
  description,
  price,
  currency
) => {
  try {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName("tr");

    for (let row of rows) {
      const secondCellText = row.cells[1]?.textContent.trim();

      if (secondCellText === "انتخاب نشده") {
        row.setAttribute("data-id", element.dataset.id);
        row.cells[1].textContent = description;
        row.cells[2].innerHTML = `${new Intl.NumberFormat()
          .format(price)
          .replace(/,/g, "/")} ${await renderCurrency(currency)}`;
        row.classList.add("book-passenger__row__selected");
        row.cells[2].insertAdjacentHTML(
          "beforeend",
          ` <p class="book-text-red-600 book-mt-1 book-cursor-pointer" onclick="removePassengerServices(this)">حذف</p>`
        );

        let serviceAttr = "";
        if (tableId.includes("seat")) {
          serviceAttr = "data-seatId";
        } else if (tableId.includes("meal") || tableId.includes("baggage")) {
          serviceAttr = "data-serviceId";
        }

        const rowIndex = row.getAttribute("data-index");

        const passengerContainers = document.querySelectorAll(
          ".book-passengers__container .book-passenger__container"
        );
        passengerContainers.forEach((container) => {
          const containerIndex = container.getAttribute("data-index");
          if (
            containerIndex === rowIndex &&
            !container.closest(".book-hidden")
          ) {
            let currentValue = container.getAttribute(serviceAttr);
            let currentArray = [];
            if (currentValue) {
              try {
                currentArray = JSON.parse(currentValue);
              } catch {
                currentArray = [];
              }
            }
            const idToAdd = element.dataset.id;
            if (!currentArray.includes(idToAdd)) {
              currentArray.push(idToAdd);
            }
            container.setAttribute(serviceAttr, JSON.stringify(currentArray));
          }
        });

        originalServiceTotalCost += price;
        updatePrices(
          parseInt(originalTotalCom) + parseInt(originalServiceTotalCost),
          parseInt(originalFirstPay) + parseInt(originalServiceTotalCost)
        );

        if (tableId.includes("seat")) {
          element.classList.add("book-seat__selected");
        }

        const allRowsFilled = Array.from(rows)
          .slice(1)
          .every((r) => r.cells[1]?.textContent.trim() !== "انتخاب نشده");

        if (allRowsFilled) {
          let serviceType = tableId.includes("baggage")
            ? "baggage"
            : tableId.includes("meal")
            ? "meal"
            : tableId.includes("seat")
            ? "seat"
            : "unknown";

          const currentRouteSection = table.closest(".book-route__service");
          const serviceContainer = table.closest(".book-services__content");
          const allRouteSections = serviceContainer.querySelectorAll(
            ".book-route__service"
          );
          const currentRouteIndex =
            Array.from(allRouteSections).indexOf(currentRouteSection);

          if (currentRouteIndex < allRouteSections.length - 1) {
            const nextRouteSection = allRouteSections[currentRouteIndex + 1];
            const nextRouteId = nextRouteSection.id;

            // پیدا کردن هدر مسیر بعدی با روش مقاوم‌تر
            const parentContainer = nextRouteSection.closest(
              ".book-excessService__content"
            );
            const nextRouteHeader = parentContainer.querySelector(
              '.book-flex[onclick*="toggleServiceTable"]'
            );

            if (nextRouteHeader) {
              toggleServiceTable(nextRouteHeader, nextRouteId);
            }
          }
        }

        break;
      }
    }
  } catch (error) {
    console.error(`updatePassengerTable: ${error.message}`);
  }
};

/**
 * Processes supplier credit response and updates UI based on credit status.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedSupplierCredit = async (args) => {
  try {
    const response = args.response;
    if (response.status === 200) {
      const responseJson = await response.json();
      if (responseJson === false) {
        // Handle case where supplier credit is invalid
        const messageBox = document.querySelector(".book-nodata__container");
        const mainContainer = document.querySelector(".book-main__container");
        // sessionStorage.removeItem("sessionSearch");
        // sessionStorage.removeItem("sessionBook");
        // sessionStorage.removeItem("sessionAmenities");
        // Show message box and hide main container
        if (messageBox) messageBox.classList.remove("book-hidden");
        if (mainContainer) mainContainer.classList.add("book-hidden");
      }
    } else {
      // Handle non-200 response by clearing flight book and showing expiry message
      // sessionStorage.removeItem("sessionBook");
      document
        .querySelector(".book-expire__message__modal__container")
        ?.classList.remove("book-hidden");
      document.querySelector(".book-no__time")?.classList.remove("book-hidden");
    }
  } catch (err) {
    console.error(
      `onProcessedSupplierCredit: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Processes previous passengers response and updates UI to display passenger list.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedPreviousPassengers = async (args) => {
  try {
    const response = args.response;
    if (response.status === 200) {
      const responseJson = await response.json();
      if (responseJson) {
        const previousPassengersContainer = document.querySelector(
          ".book-previous__passengers__container"
        );
        // Show previous passengers container if hidden
        if (previousPassengersContainer?.classList.contains("book-hidden")) {
          previousPassengersContainer.classList.remove("book-hidden");
        }
        // Hide the next sibling of the previous passenger container
        document
          .querySelector(
            ".book-selected__passenger .book-previous__passenger__container"
          )
          ?.nextElementSibling?.classList.add("book-hidden");
        // Trigger grid rendering with response data
        $bc.setSource("cms.gridPreviousPassengers", responseJson);
      }
    }
  } catch (err) {
    console.error(
      `onProcessedPreviousPassengers: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Processes user credit response and renders credit payment option if sufficient credit exists.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedUserCredit = async (args) => {
    try {
        const response = args.response;
        console.log(response);
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson) {
                const userCredit = parseFloat(responseJson.user_credit);
                const firstPay = parseFloat(document.querySelector(".book-firstpay__cost").textContent);
                if (userCredit > firstPay) {
                    const container = document.querySelector(".book-invoice__container");
                    const currencyUnit = document.querySelector(".book-unit__content span").textContent;
                    const isWallet = document.querySelector(".book-buyers__container").dataset.accounttype === "3";


                    const html = `
                        <div class="book-invoice__content book-cursor-pointer book-p-2" data-run="0" onclick="submitInvoice(this,'credit__Invoice')">
                            <ul class="${isMobile ? 'book-text-center' : 'book-flex book-justify-between book-items-center'}">
                                <li class="${isMobile ? 'book-my-1' : ''}">${isWallet ? translate("wallet_payment") : translate("credit_payment")}</li>
                                <li class="${isMobile ? 'book-my-1' : ''}">
                                    <img src="/booking/images/credit-booking.png" alt="creditlogo" width="50" height="50" />
                                </li>
                                <li class="${isMobile ? 'book-my-1' : ''}">
                                    <p>${translate("remaining_credit")} :</p>
                                    <span class="book-price_remaining_of_credit">${new Intl.NumberFormat().format(userCredit - firstPay)}</span>
                                    <span class="book-text-xs book-mx-1">${currencyUnit}</span>
                                </li>
                                <li class="${isMobile ? 'book-my-2' : ''}">
                                    <span class="book-totalcom__cost">${document.querySelector(".book-firstpay__cost").textContent}</span>
                                    <span class="book-text-xs book-mx-1">${currencyUnit}</span>
                                </li>
                                <li class="${isMobile ? 'book-my-1' : ''}">
                                    <button type="button" class="book-btn__content book-text-white book-rounded-2xl book-p-3 book-cursor-pointer book-text-center book-bg-primary-400 book-next__btn hover:book-bg-secondary-400">
                                        ${translate("confirm_and_pay")}
                                    </button>
                                </li>
                            </ul>
                        </div>`;

                    container?.insertAdjacentHTML("beforeend", html);
                }
            }
        }
    } catch (error) {
        console.error("onProcessedUserCredit: " + error.message);
    }
};

/**
 * Processes country ID API response and renders country list in dropdowns.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedJsonCountryId = async (args) => {
  try {
    const response = args.response;
    if (response.status === 200) {
      const responseJson = await response.json();
      if (responseJson) {
        // Generate HTML for country list items
        let output = "";
        for (const item of responseJson) {
          output += `<li class="book-li-item book-cursor-pointer book-p-2" data-id="${item.id}" data-value="${item.fa}" onclick="selectDropItem(this,'book-info__item__container')">${item.fa}</li>`;
        }

        // Update all NameOfCountry dropdowns in passenger containers
        document
          .querySelectorAll(".book-passenger__container")
          ?.forEach((e) => {
            e.querySelectorAll(".book-NameOfCountry").forEach((ie) => {
              // Set data-run attribute to indicate processing completion
              ie.setAttribute("data-run", "1");
              // Insert country list HTML into dropdown content
              const dropContent = ie
                .closest(".book-info__item__container")
                ?.querySelector(".book-drop__item__content");
              if (dropContent) {
                dropContent.innerHTML = output;
                // Hide loader if present
                const loader = ie
                  .closest(".book-info__item__container")
                  ?.querySelector(".book-drop__loader__content");
                if (loader) {
                  loader.classList.add("book-hidden");
                }
              }
            });
          });
      }
    }
  } catch (err) {
    console.error(
      `onProcessedJsonCountryId: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Processes country code API response and renders country code list in dropdowns.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedJsonCountryCode = async (args) => {
  try {
    const response = args.response;
    if (response.status === 200) {
      const responseJson = await response.json();
      if (responseJson) {
        // Generate HTML for country code list items
        let output = "";
        for (const item of responseJson) {
          output += `<li class="book-li-item book-cursor-pointer book-p-2" data-id="${item.code}" data-value="${item.fa}" onclick="selectDropItem(this,'book-code__item__container')">${item.fa}<span class="book-mr-2">(${item.code})</span></li>`;
        }

        // Update all code dropdowns in buyer info containers
        document
          .querySelectorAll(".book-buyer__info__content")
          ?.forEach((e) => {
            e.querySelectorAll(".book-code").forEach((ie) => {
              // Set data-run attribute to indicate processing completion
              ie.setAttribute("data-run", "1");
              // Insert country code list HTML into dropdown content if it exists
              const dropContent = ie
                .closest(".book-info__item__container")
                ?.querySelector(".book-drop__item__content");
              if (dropContent) {
                dropContent.innerHTML = output;
                // Hide loader if present
                const loader = ie
                  .closest(".book-info__item__container")
                  ?.querySelector(".book-drop__loader__content");
                if (loader) {
                  loader.classList.add("book-hidden");
                }
              }
            });
          });
      }
    }
  } catch (err) {
    console.error(
      `onProcessedJsonCountryCode: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};
/**
 * Timer configuration: total time set to 1200 seconds (20 minutes).
 */
let totalTime = 1200; // 20 minutes

/**
 * Starts and updates the booking timer displayed in the UI.
 * Decrements the timer every second, updates the display, and handles expiration.
 */
const startTimer = () => {
  try {
    const timerDisplay = document.querySelector(".book-timer__left__container");

    // Calculate minutes and seconds
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;

    // Update timer display
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
    if (totalTime === 360) {
      document
        .querySelector(".book-expire__message__modal__container")
        .classList.remove("book-hidden");
      document
        .querySelector(".book-some__time")
        .classList.remove("book-hidden");
    }

    if (totalTime > 0) {
      totalTime--;
      setTimeout(startTimer, 1000);
    } else {
      // sessionStorage.removeItem("sessionBook");
      document
        .querySelector(".book-expire__message__modal__container")
        .classList.remove("book-hidden");
      document.querySelector(".book-no__time").classList.remove("book-hidden");
      document.querySelector(".book-some__time").classList.add("book-hidden");
    }
  } catch (error) {
    console.error("startTimer: " + error.message);
  }
};

/**
 * Sets up flight group data and initializes booking UI.
 * Loads booking data, passenger counts, and extra services UI.
 */
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
/**
 * Renders amenities list with chargeable status indicators.
 * @param {Array} element - List of amenities with description and isChargeable status.
 * @returns {Promise<string>} HTML string of amenities list or empty string on error.
 */
const renderAmenities = async (element) => {
  try {
    let output = "";
    for (const item of element || []) {
      const icon =
        item.isChargeable == 0 ? "check-circle-icon" : "dash-circle-icon";
      output += `<li class="book-flex book-items-center book-gap-2 book-my-1">
              <svg width="${icon === "check-circle-icon" ? 17 : 20}" height="${
        icon === "check-circle-icon" ? 16 : 20
      }" class="book-shrink-0">
                  <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
              </svg>
              <span>${item.description}</span>
          </li>`;
    }
    return output;
  } catch (error) {
    console.error(`renderAmenities: ${error.message}`);
    return "";
  }
};
/**
 * Scrolls to a specific section within a modal and updates tab navigation.
 * @param {HTMLElement} element - The element triggering the scroll.
 * @param {string} type - The type of content to toggle.
 * @param {string} parent - The parent container class.
 */

// اسکرول هوشمند: هم کانتینر، هم در صورت نیاز خود صفحه
// const scrollModalContainerItem = async (element, type, parent, opts = {}) => {
//   const options = {
//     pad: 12,              // فاصله از لبه‌ها داخل کانتینر
//     stickyOffset: 0,      // اگر هدر چسبان داری، ارتفاعش رو اینجا بده (px)
//     alignTop: true,       // اگر true: سر باکس به لبه بالای مرورگر بچسبد
//     openWaitMs: 300,      // زمان انتظار برای باز شدن آکاردئون (اگر transition داری هماهنگ کن)
//     ...opts
//   };

//   try {
//     const container = element.closest(".book-aside__content");
//     if (!container) return;

//     const target = container.querySelector(`.${parent}`);
//     if (!target) return;

//     // 1) بازکردن آکاردئون (در صورت بسته بودن)
//     const header = target.querySelector(".book-content__api");
//     const content = target.querySelector(".book-api__container__content");
//     if (header) {
//       const isCollapsed = content && (
//         getComputedStyle(content).display === "none" ||
//         content.clientHeight === 0
//       );
//       if (isCollapsed) {
//         if (typeof toggleContentApi === "function") {
//           toggleContentApi(header, type, parent, true);
//         } else if (content) {
//           content.style.display = "block";
//         }
//         await waitForOpen(content, options.openWaitMs);
//       }
//     }

//     // 2) اسکرول داخل کانتینر تا جایی که کل باکس دیده شود
//     const shortfall = scrollSectionIntoContainer(container, target, options.pad);

//     // 3) اگر هنوز کامل دیده نمی‌شود (کمبود فضا در کانتینر)، صفحه را هم اسکرول بده
//     if (shortfall > 0) {
//       // مقدار مورد نیاز برای آوردن کامل باکس داخل viewport
//       const tRect = target.getBoundingClientRect();
//       const need = Math.max(shortfall, tRect.bottom - (window.innerHeight - options.stickyOffset) + options.pad);

//       // اگر alignTop خواستی: سر باکس به بالای viewport بچسبد
//       let topAlignDelta = 0;
//       if (options.alignTop) {
//         const tRect2 = target.getBoundingClientRect();
//         topAlignDelta = tRect2.top - options.stickyOffset - options.pad; // اگر مثبت است یعنی باید بالا برویم
//       }

//       const delta = options.alignTop ? topAlignDelta : need;

//       if (Math.abs(delta) > 1) {
//         window.scrollBy({ top: delta, behavior: "smooth" });
//       }

//       // بعد از اسکرول صفحه، اگر خود content اسکرول داخلی دارد، تا ته اسکرول بده تا کامل دیده شود
//       if (content && content.scrollHeight > content.clientHeight) {
//         content.scrollTo({ top: content.scrollHeight, behavior: "smooth" });
//       }
//     } else {
//       // اگر داخل کانتینر کامل دیده می‌شود ولی alignTop=true است،
//       // می‌توانیم سر باکس را به لبه‌ی بالای مرورگر بچسبانیم (اختیاری)
//       if (options.alignTop) {
//         const tRect = target.getBoundingClientRect();
//         const deltaTop = tRect.top - options.stickyOffset - options.pad;
//         if (Math.abs(deltaTop) > 1) {
//           window.scrollBy({ top: deltaTop, behavior: "smooth" });
//         }
//       }
//     }

//     // 4) تب فعال
//     container.querySelectorAll(".book-tab__navigation__content")
//       .forEach(tab => tab.classList.remove("book-active__tab__navigation"));
//     element.classList.add("book-active__tab__navigation");

//   } catch (err) {
//     console.error("scrollModalContainerItem:", err.message);
//   }
// };

// // --- Helpers ---

// function waitForOpen(content, fallbackMs = 300) {
//   return new Promise((resolve) => {
//     if (!content) return resolve();
//     // اگر همین الان باز است
//     if (getComputedStyle(content).display !== "none" && content.clientHeight > 0) {
//       requestAnimationFrame(() => setTimeout(resolve, 0));
//       return;
//     }
//     // اگر transition داریم
//     const onEnd = () => {
//       content.removeEventListener("transitionend", onEnd);
//       requestAnimationFrame(() => setTimeout(resolve, 0));
//     };
//     content.addEventListener("transitionend", onEnd, { once: true });
//     // fallback
//     setTimeout(() => {
//       content.removeEventListener("transitionend", onEnd);
//       resolve();
//     }, fallbackMs);
//   });
// }


const scrollModalContainerItem = async (element, type, parent, opts = {}) => {
  const options = {
    pad: 12,
    stickyOffsetTop: 0,       // هدر چسبان بالا (px)
    stickyOffsetBottom: 0,    // فوتر/استیکی پایین که می‌پوشاند (px)
    alignTop: true,
    openWaitMs: 300,
    ...opts
  };

  try {
    const container = element.closest(".book-aside__content");
    if (!container) return;

    const target = container.querySelector(`.${parent}`);
    if (!target) return;

    // 1) باز کردن آکاردئون (در صورت نیاز)
    const header = target.querySelector(".book-content__api");
    const content = target.querySelector(".book-api__container__content");
    if (header) {
      const collapsed = content && (
        getComputedStyle(content).display === "none" || content.clientHeight === 0
      );
      if (collapsed) {
        if (typeof toggleContentApi === "function") {
          toggleContentApi(header, type, parent, true);
        } else if (content) {
          content.style.display = "block";
        }
        await waitForOpen(content, options.openWaitMs);
      }
    }

    // 2) اسکرول داخلی کانتینر را "آنـی" انجام بده تا اندازه‌گیری دقیق بشه
    const { shortfall } = scrollSectionIntoContainer(container, target, options.pad, /*instant*/ true);

    // 3) دو فریم صبر کن تا layout تثبیت بشه
    await nextFrame(); await nextFrame();

    // 4) اگر هنوز جا کم داریم یا می‌خوایم بچسبونیم به بالا، اسکرول صفحه
    const rect = target.getBoundingClientRect();
    const viewportH = window.innerHeight - options.stickyOffsetTop - options.stickyOffsetBottom;

    let delta = 0;
    if (options.alignTop) {
      // بچسبون به بالای viewport (با لحاظ هدر چسبان و pad)
      delta = rect.top - options.stickyOffsetTop - options.pad;
    } else if (shortfall > 0 || rect.bottom > window.innerHeight - options.stickyOffsetBottom) {
      // به اندازه نیاز بیار تا کامل دیده بشه
      const need = Math.max(
        shortfall,
        rect.bottom - (window.innerHeight - options.stickyOffsetBottom) + options.pad
      );
      delta = need;
    }

    if (Math.abs(delta) > 1) {
      window.scrollBy({ top: delta, behavior: "smooth" });
    }

    // 5) اگر خود content اسکرول داخلی دارد و هنوز بخشی دیده نمی‌شود، تا ته اسکرولش بده
    if (content && content.scrollHeight > content.clientHeight) {
      // یک فریم بعد از اسکرول صفحه
      await nextFrame();
      content.scrollTop = content.scrollHeight;
    }

    // 6) تب فعال
    container.querySelectorAll(".book-tab__navigation__content")
      .forEach(tab => tab.classList.remove("book-active__tab__navigation"));
    element.classList.add("book-active__tab__navigation");

  } catch (err) {
    console.error("scrollModalContainerItem:", err.message);
  }
};

// --- Helpers ---

function waitForOpen(content, fallbackMs = 300) {
  return new Promise((resolve) => {
    if (!content) return resolve();
    // اگر همین الان باز و دارای ارتفاع است
    if (getComputedStyle(content).display !== "none" && content.clientHeight > 0) {
      requestAnimationFrame(() => setTimeout(resolve, 0));
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => setTimeout(resolve, 0));
    };
    const onEnd = (e) => finish();
    content.addEventListener("transitionend", onEnd, { once: true });
    content.addEventListener("animationend", onEnd, { once: true });
    setTimeout(finish, fallbackMs); // فالبک
  });
}

/**
 * target را داخل container کاملاً نشان می‌دهد.
 * اگر به انتهای اسکرول container برسیم، shortfall برمی‌گرداند.
 * @param instant اگر true باشد اسکرول داخلی "آنـی" ست می‌شود (برای دقت اندازه‌گیری توصیه می‌شود)
 */
function scrollSectionIntoContainer(container, target, pad = 0, instant = true) {
  const targetTopInContainer = getOffsetTopWithin(target, container);
  const currentTop = container.scrollTop;
  const containerH = container.clientHeight;
  const targetH = target.offsetHeight;

  const topRel = targetTopInContainer - currentTop;
  const bottomRel = topRel + targetH;

  let newTop = currentTop;

  if (topRel < pad) {
    newTop = targetTopInContainer - pad;
  } else if (bottomRel > containerH - pad) {
    newTop = targetTopInContainer - (containerH - targetH) + pad;
  } else {
    return { shortfall: 0 };
  }

  const maxScroll = container.scrollHeight - container.clientHeight;
  newTop = Math.max(0, Math.min(maxScroll, newTop));

  const neededDelta = newTop - currentTop;
  const canDelta = neededDelta > 0 ? (maxScroll - currentTop) : currentTop;
  const shortfall = Math.max(0, Math.abs(neededDelta) - canDelta);

  if (instant) {
    container.scrollTop = newTop; // بدون smooth → اندازه‌ها دقیق می‌شوند
  } else {
    container.scrollTo({ top: newTop, behavior: "smooth" });
  }
  return { shortfall };
}

function getOffsetTopWithin(el, ancestor) {
  let top = 0, node = el;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => r()));
}


/**
 * تلاش می‌کند target را کاملاً داخل container نشان دهد.
 * اگر به انتهای اسکرول container برسیم و هنوز بخشی از target دیده نشود،
 * میزانی که کم آورده‌ایم (shortfall) را برمی‌گرداند تا با window جبران کنیم.
 * @returns {number} shortfall (px) — 0 یعنی کامل دیده شد
 */
function scrollSectionIntoContainer(container, target, pad = 0) {
  // موقعیت target نسبت به container
  const targetTopInContainer = getOffsetTopWithin(target, container);
  const currentTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const targetHeight = target.offsetHeight;

  // فاصله نسبی target نسبت به نمای فعلی container
  const topRel = targetTopInContainer - currentTop;
  const bottomRel = topRel + targetHeight;

  let newTop = currentTop;

  if (topRel < pad) {
    // بالای دید → بیار بالا
    newTop = targetTopInContainer - pad;
  } else if (bottomRel > containerHeight - pad) {
    // پایین دید → بیار پایین تا کامل دیده شود
    newTop = targetTopInContainer - (containerHeight - targetHeight) + pad;
  } else {
    // همین الان کامل داخل دید است
    return 0;
  }

  // clamp در محدوده اسکرول
  const maxScroll = container.scrollHeight - container.clientHeight;
  newTop = Math.max(0, Math.min(maxScroll, newTop));

  // اگر نمی‌توانیم به اندازه لازم اسکرول کنیم، shortfall حساب کنیم
  const neededDelta = newTop - currentTop;
  const canDelta = Math.sign(neededDelta) > 0
    ? (maxScroll - currentTop)            // ظرفیت اسکرول رو به پایین
    : currentTop;                          // ظرفیت اسکرول رو به بالا

  const shortfall = Math.max(0, Math.abs(neededDelta) - canDelta);

  container.scrollTo({ top: newTop, behavior: "smooth" });
  return shortfall;
}

function getOffsetTopWithin(el, ancestor) {
  let top = 0;
  let node = el;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}



/**
 * Sets up the session data and updates the UI based on flight search parameters.
 * @param {Object} args - Arguments containing source data with SessionId.
 * @returns {void}
 */
const setSession = async (args) => {
  try {
    // Extract new session ID from source data
    const newSessionId = args.source?.rows?.[0]?.SessionId;
    if (!newSessionId) throw new Error("SessionId not found in source data");

    // Set expiry time (20 minutes)
    const now = new Date();
    const ttl = 20 * 60 * 1000; // 20 minutes in milliseconds

    // Load or initialize flight search data from sessionStorage
    let currentSessionSearch = sessionStorage.getItem("sessionSearch");
    sessionSearchStorage = currentSessionSearch
      ? JSON.parse(currentSessionSearch)
      : {};

    // Update session ID and expiry
    sessionSearchStorage.SessionId = newSessionId;
    sessionSearchStorage.Expiry = now.getTime() + ttl;

    // Save updated flight search data to sessionStorage
    sessionStorage.setItem(
      "sessionSearch",
      JSON.stringify(sessionSearchStorage)
    );

    // Initialize flight group UI
    await setbusGroup(); // Assumed to be defined elsewhere
  } catch (err) {
    console.error(
      `setSession: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Hides the warning modal when the user confirms.
 * @param {HTMLElement} element - The button element triggering the confirmation.
 * @returns {void}
 */
const warningConfirm = (element) => {
  try {
    // Find and hide the warning modal container
    const modal = element.closest(".book-warning__message__modal__container");
    if (!modal) throw new Error("Warning modal container not found");
    modal.classList.add("book-hidden");
  } catch (err) {
    console.error(
      `warningConfirm: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Redirects to the homepage when the user rejects the warning.
 * @param {HTMLElement} element - The button element triggering the rejection.
 * @returns {void}
 */
const warningReject = (element) => {
  try {
    // Redirect to homepage
    window.location = "/";
  } catch (err) {
    console.error(
      `warningReject: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Updates passenger table with selected baggage, meal, or seat services and adjusts prices.
 * @param {HTMLElement} element - The element triggering the service selection.
 * @param {string} tableId - The ID of the passenger table to update.
 * @param {string} description - The description of the selected service.
 * @param {number} price - The price of the selected service.
 * @param {string} currency - The currency of the service price.
 * @returns {void}
 */
const updatePassengerServices = async (
  element,
  tableId,
  description,
  price,
  currency
) => {
  try {
    // Get the passenger table
    const table = document.getElementById(tableId);
    if (!table) throw new Error(`Table with ID ${tableId} not found`);
    const rows = table.getElementsByTagName("tr");

    // Find the first unselected row and update it
    for (let row of rows) {
      const secondCellText = row.cells[1]?.textContent?.trim();
      if (secondCellText === "انتخاب نشده") {
        // Update row with service details
        row.setAttribute("data-id", element.dataset.id);
        row.cells[1].textContent = description;
        row.cells[2].innerHTML = `${new Intl.NumberFormat().format(
          price
        )} ${await renderCurrency(currency)}`;
        row.classList.add("book-passenger__row__selected");
        row.cells[2].insertAdjacentHTML(
          "beforeend",
          ` <p class="book-text-red-600 book-mt-1 book-cursor-pointer" onclick="removePassengerServices(this)">حذف</p>`
        );

        // Determine service attribute based on table type
        let serviceAttr = "";
        let labelAttr = "";
        if (tableId.includes("seat")) {
          serviceAttr = "data-seatId";
          labelAttr = "data-label-seat";
        } else if (tableId.includes("meal") || tableId.includes("baggage")) {
          serviceAttr = "data-serviceId";
          labelAttr = "data-label-service";
        }

        // Update passenger container attributes
        const rowIndex = row.getAttribute("data-index");
        const passengerContainers = document.querySelectorAll(
          ".book-passengers__container .book-passenger__container"
        );
        passengerContainers.forEach((container) => {
          const containerIndex = container.getAttribute("data-index");
          if (
            containerIndex === rowIndex &&
            !container.closest(".book-hidden")
          ) {
            let currentValue = container.getAttribute(serviceAttr);
            let currentArray = [];
            if (currentValue) {
              try {
                currentArray = JSON.parse(currentValue);
              } catch {
                currentArray = [];
              }
            }
            const idToAdd = element.dataset.id;
            if (!currentArray.includes(idToAdd)) {
              currentArray.push(idToAdd);
            }
            container.setAttribute(serviceAttr, JSON.stringify(currentArray));
            let currentLabels = container.getAttribute(labelAttr) || "";
            let labelArray = currentLabels ? currentLabels.split(",") : [];
            if (!labelArray.includes(description)) {
              labelArray.push(description);
            }
            container.setAttribute(labelAttr, labelArray.join(","));
          }
        });

        // Update total service cost and prices
        originalServiceTotalCost += price;
        updatePrices(
          parseInt(originalTotalCom) + parseInt(originalServiceTotalCost),
          parseInt(originalFirstPay) + parseInt(originalServiceTotalCost)
        ); // Assumed to be defined elsewhere

        // Mark seat as selected if applicable
        if (tableId.includes("seat")) {
          element.classList.add("book-seat__selected");
        }

        // Check if all rows are filled and move to next route if needed
        const allRowsFilled = Array.from(rows)
          .slice(1)
          .every((r) => r.cells[1]?.textContent?.trim() !== "انتخاب نشده");
        if (allRowsFilled) {
          const serviceType = tableId.includes("baggage")
            ? "baggage"
            : tableId.includes("meal")
            ? "meal"
            : tableId.includes("seat")
            ? "seat"
            : "unknown";

          const currentRouteSection = table.closest(".book-route__service");
          const serviceContainer = table.closest(".book-services__content");
          const allRouteSections = serviceContainer?.querySelectorAll(
            ".book-route__service"
          );
          const currentRouteIndex =
            Array.from(allRouteSections).indexOf(currentRouteSection);

          if (currentRouteIndex < allRouteSections.length - 1) {
            const nextRouteSection = allRouteSections[currentRouteIndex + 1];
            const nextRouteId = nextRouteSection.id;
            const parentContainer = nextRouteSection.closest(
              ".book-excessService__content"
            );
            const nextRouteHeader = parentContainer?.querySelector(
              '.book-flex[onclick*="toggleServiceTable"]'
            );

            if (nextRouteHeader) {
              toggleServiceTable(nextRouteHeader, nextRouteId); // Assumed to be defined elsewhere
            }
          }
        }

        break; // Exit after updating the first unselected row
      }
    }
  } catch (err) {
    console.error(
      `updatePassengerServices: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Removes a selected service from the passenger table and updates prices.
 * @param {HTMLElement} element - The element triggering the service removal (e.g., "حذف" link).
 * @returns {void}
 */
const removePassengerServices = (element) => {
  try {
    // Get the row containing the service
    const row = element.closest("tr");
    if (!row) throw new Error("Parent row not found");

    // Extract service details
    const idToRemove = row.getAttribute("data-id");
    const labelToRemove = row.cells[1]?.textContent?.trim();
    if (!idToRemove || !labelToRemove)
      throw new Error("Service ID or label not found");

    // Extract price from cell text
    const rawPriceText = row.cells[2]?.textContent?.split(" ")[0] || "";
    const priceNumber = parseInt(rawPriceText.replace(/[^\d]/g, ""), 10);
    if (isNaN(priceNumber)) throw new Error("Invalid price format");

    // Reset row to unselected state
    row.cells[1].textContent = "انتخاب نشده";
    row.cells[2].textContent = "---";
    row.setAttribute("data-id", "");
    row.classList.remove("book-passenger__row__selected");

    // Determine service type and attributes
    const closestRendering = row.closest(
      ".book-api__container__rendering__seatService, .book-api__container__rendering__baggageService, .book-api__container__rendering__mealService"
    );
    if (!closestRendering) throw new Error("Rendering container not found");

    let serviceAttr = "";
    let labelAttr = "";
    if (
      closestRendering.classList.contains(
        "book-api__container__rendering__seatService"
      )
    ) {
      serviceAttr = "data-seatId";
      labelAttr = "data-label-seat";
    } else if (
      closestRendering.classList.contains(
        "book-api__container__rendering__baggageService"
      ) ||
      closestRendering.classList.contains(
        "book-api__container__rendering__mealService"
      )
    ) {
      serviceAttr = "data-serviceId";
      labelAttr = "data-label-service";
    }

    // Update passenger container attributes
    const rowIndex = row.getAttribute("data-index");
    if (!rowIndex) throw new Error("Row index not found");

    const passengerContainers = document.querySelectorAll(
      ".book-passengers__container .book-passenger__container"
    );
    passengerContainers.forEach((container) => {
      if (!container.closest(".book-hidden")) {
        const containerIndex = container.getAttribute("data-index");
        if (containerIndex === rowIndex) {
          let currentValue = container.getAttribute(serviceAttr);
          let currentArray = [];
          if (currentValue) {
            try {
              currentArray = JSON.parse(currentValue);
            } catch {
              currentArray = [];
            }
          }
          const filteredArray = currentArray.filter((id) => id !== idToRemove);
          container.setAttribute(serviceAttr, JSON.stringify(filteredArray));

          let currentLabels = container.getAttribute(labelAttr);
          let labelArray = currentLabels ? currentLabels.split(",") : [];
          const filteredLabels = labelArray.filter((l) => l !== labelToRemove);
          container.setAttribute(labelAttr, filteredLabels.join(","));
        }
      }
    });

    // Reset seat selection UI if applicable
    if (serviceAttr === "data-seatId") {
      const seatElement = document.querySelector(
        `[data-id="${idToRemove}"].book-seat__selected`
      );
      if (seatElement) {
        seatElement.classList.remove("book-seat__selected");
        seatElement.querySelectorAll(".book-seat__part")?.forEach((el) => {
          el.setAttribute("fill", "#3b82f6");
        });
      }
    }

    // Update total service cost and prices
    originalServiceTotalCost -= priceNumber;
    updatePrices(
      parseInt(originalTotalCom) + parseInt(originalServiceTotalCost),
      parseInt(originalFirstPay) + parseInt(originalServiceTotalCost)
    ); // Assumed to be defined elsewhere
  } catch (err) {
    console.error(
      `removePassengerServices: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Checks sessionStorage item expiry and updates UI if expired.
 * @param {string} key - Primary key for sessionStorage (e.g., 'sessionSearch').
 * @param {string} key2 - Secondary key for sessionStorage (e.g., 'sessionSearch').
 * @returns {null} If the item is missing or expired.
 */
const getWithExpiry = (key, key2, key3) => {
  try {
    const itemStr = sessionStorage.getItem(key);
    // If the item doesn't exist, show expiry message and return null
    if (!itemStr) {
      const expiryMessage = document.querySelector(
        ".book-expire__message__container"
      );
      if (expiryMessage) expiryMessage.classList.remove("book-hidden");
      return null;
    }
    const item = JSON.parse(itemStr);
    const now = new Date();
    // Compare expiry time with current time
    if (now.getTime() > item.expiry) {
      // Remove expired items and show message box
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(key2);
      sessionStorage.removeItem(key3);
      const messageBox = document.querySelector(".book-message-box");
      const bgPopup = document.querySelector("#book-bg-popup");
      if (messageBox) messageBox.classList.remove("book-hidden");
      if (bgPopup) bgPopup.classList.remove("book-hidden");
      return null;
    }
    return item; // Return the item if not expired
  } catch (err) {
    console.error(
      `getWithExpiry: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return null;
  }
};

/**
 * Adds passenger elements to the UI based on counts for adults, children, and infants.
 * @param {string} parentSelector - CSS selector for the parent container.
 * @param {number} adults - Number of adult passengers.
 * @param {number} children - Number of child passengers.
 * @param {number} infants - Number of infant passengers.
 */

// Helper function to create hidden seat ID input
const createSeatIdInput = (parentElement) => {
  const seatIdInput = document.createElement("input");
  seatIdInput.type = "hidden";
  seatIdInput.className = "seat-id";
  seatIdInput.name = `seat-id-selected`;
  // seatIdInput.name = `seat-id-${parentElement.getAttribute('data-index')}`;
  parentElement.appendChild(seatIdInput);
  return seatIdInput;
};

const addPassenger = (parentSelector, adults, children, infants) => {
  try {
    const busId = sessionBookStorage.busId;
    const parent = document.querySelector(parentSelector);
    const templateElement = parent.querySelector(".book-passenger__container");
    parent.innerHTML = ""; // Clear existing content
    let dataIndex = 1; // Start indexing from 1
    let adultCounter = 1,
      childCounter = 1,
      infantCounter = 1;
    let seatIndex = 0; // Index for selectedSeats array

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

    // Helper function to add passengers of a specific category
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
        // Set title with Persian ordinal number
        const ordinalText = ordinalNumbers[counter - 1] || `${counter}`;
        newElement.querySelector(
          ".book-passenger__container__title"
        ).textContent = `${category} ${ordinalText}`;

        // Add seat information if available
        if (selectedSeats && selectedSeats[seatIndex]) {
          const seatInfo = selectedSeats[seatIndex];

          // Add seat number to the card
          const seatNumberElement =
            newElement.querySelector(".seat-number") ||
            createSeatInfoElement(newElement, "seat-number");
          seatNumberElement.textContent = `صندلی: ${seatInfo.number}`;

          // Add seat ID (hidden input for form submission)
          const seatIdInput =
            newElement.querySelector(".seat-id") ||
            createSeatIdInput(newElement);
          seatIdInput.value = seatInfo.id;

          // Store seat info in data attributes for easy access
          newElement.setAttribute("data-seat-id", seatInfo.id);
          newElement.setAttribute("data-seat-number", seatInfo.number);

          seatIndex++; // Move to next seat
        }

        parent.appendChild(newElement);
        dataIndex++;
        counter++;
      }
    };

    // Helper function to create seat info element
    const createSeatInfoElement = (parentElement, className) => {
      const seatInfoDiv = document.createElement("div");
      seatInfoDiv.className = `seat-info ${className}`;
      seatInfoDiv.style.cssText = `
                margin: 0 20px;
                color: gray;
                padding: 0 5px;
                font-size: 12px;
            `;

      // Add to title area or create a seat info container
      const titleElement = parentElement.querySelector(
        ".book-passenger__container__title"
      );
      if (titleElement) {
        titleElement.parentNode.insertBefore(
          seatInfoDiv,
          titleElement.nextSibling
        );
      } else {
        parentElement.appendChild(seatInfoDiv);
      }

      return seatInfoDiv;
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

// Usage example:
// addPassenger('.passengers-container', 2, 1, 0, selectedSeats);
// or
// addPassengerWithSeatDisplay('.passengers-container', 2, 1, 0, selectedSeats);

/**
 * Adds an error message to a field and marks it as invalid.
 * @param {HTMLElement} field - The input field to mark as invalid.
 * @param {string} message - The error message to display.
 */
const addError = (field, message) => {
  try {
    // Mark the field container as invalid
    field.closest(".book-info__item__content").classList.add("book-invalid");
    // Insert error message HTML
    bookToast(message);

    // field.closest(".book-info__item__container").insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">${message}</div>`);
  } catch (err) {
    console.error(
      `addError: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Adds an error message for a date field and marks date components as invalid.
 * @param {string} message - The error message to display.
 * @param {HTMLElement} dateField - The date input field.
 */
const addDateError = (message, dateField) => {
  try {
    // Mark year, month, and day components as invalid
    ["year", "month", "day"].forEach((item) => {
      const component = dateField
        .closest(".book-info__item__container")
        .querySelector(`.book-${item}`);
      if (component) {
        component
          .closest(".book-info__item__content")
          .classList.add("book-invalid");
      }
    });
    // Insert error message if not already present
    if (
      !dateField
        .closest(".book-info__item__container")
        .querySelector(".book-alert__content")
    ) {
      bookToast(message);

      // dateField.closest(".book-info__item__container").insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">${message}</div>`);
    }
  } catch (err) {
    console.error(
      `addDateError: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Removes error state and message from a date field.
 * @param {HTMLElement} dateField - The date input field.
 */
const removeDateError = (dateField) => {
  try {
    // Remove invalid state from year, month, and day components
    ["year", "month", "day"].forEach((item) => {
      const component = dateField
        .closest(".book-info__item__container")
        .querySelector(`.book-${item}`);
      if (component) {
        component
          .closest(".book-info__item__content")
          .classList.remove("book-invalid");
      }
    });
    // Remove all error messages
    dateField
      .closest(".book-info__item__container")
      .querySelectorAll(".book-alert__content")
      .forEach((desc) => desc.remove());
  } catch (err) {
    console.error(
      `removeDateError: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Removes error state and message from a field.
 * @param {HTMLElement} field - The input field.
 */
const removeError = (field) => {
  try {
    // Remove invalid state from the field container
    field.closest(".book-info__item__content").classList.remove("book-invalid");
    // Remove all error messages
    field
      .closest(".book-info__item__container")
      .querySelectorAll(".book-alert__content")
      .forEach((desc) => desc.remove());
  } catch (err) {
    console.error(
      `removeError: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Removes alert content and invalid state from an element's container.
 * @param {HTMLElement} element - The element associated with the alert.
 */
const removeAlertContent = (element) => {
  try {
    // Remove alert content if present
    const alertContent = element
      .closest(".book-info__item__container")
      .querySelector(".book-alert__content");
    if (alertContent) {
      alertContent.remove();
    }
    // Remove invalid state from info item content
    const infoContent = element.closest(".book-info__item__content");
    if (infoContent && infoContent.classList.contains("book-invalid")) {
      infoContent.classList.remove("book-invalid");
    }
    // Remove invalid state from gender field if present
    const genderField = element
      .closest(".book-info__item__container")
      .querySelector(".book-info__item__content .book-Gender");
    if (
      genderField &&
      genderField
        .closest(".book-info__item__content")
        .classList.contains("book-invalid")
    ) {
      genderField
        .closest(".book-info__item__content")
        .classList.remove("book-invalid");
    }
  } catch (err) {
    console.error(
      `removeAlertContent: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Updates the price display based on provided total and first pay values.
 * @param {number} [totalcom] - Total commercial cost (optional).
 * @param {number} [firstpay] - First payment amount (optional).
 */
const updatePrices = async (totalcom, firstpay) => {
  try {
    if (totalcom !== undefined && firstpay !== undefined) {
      const firstpayPrice = parseInt(firstpay);
      let totalcomPrice = parseInt(totalcom);
      // Update total commercial cost if different from first pay
      if (totalcom !== firstpay) {
        totalcomPrice = totalcom;
        document.querySelector(".book-totalcom__cost").textContent =
          new Intl.NumberFormat().format(totalcomPrice);
      }
      document.querySelector(".book-firstpay__cost").textContent =
        new Intl.NumberFormat().format(firstpayPrice);
    } else {
      // Fallback to original costs plus service total
      const firstpayPrice =
        parseInt(originalFirstPay) + parseInt(originalServiceTotalCost);
      document.querySelector(".book-firstpay__cost").textContent =
        new Intl.NumberFormat().format(firstpayPrice);
      if (totalcom !== undefined) {
        const totalcomPrice =
          parseInt(originalTotalCom) + parseInt(originalServiceTotalCost);
        document.querySelector(".book-totalcom__cost").textContent =
          new Intl.NumberFormat().format(totalcomPrice);
      }
    }
  } catch (err) {
    console.error(
      `updatePrices: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Updates the booking step UI and attributes.
 * @param {string} stepName - Name of the current step (e.g., 'مشخصات مسافران', 'مشخصات خریدار').
 * @param {HTMLElement} element - The element triggering the step update.
 */
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

/**
 * Updates the active state of step navigation items.
 * @param {string} element - The step identifier (e.g., 'passenger', 'buyer').
 */
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
/**
 * Validates that a keypress is an English letter or space.
 * @param {Event} event - The keydown event.
 * @param {HTMLElement} element - The input element.
 * @returns {boolean} True if valid, false if invalid (prevents default action).
 */
const checkEnglishKey = (event, element) => {
  try {
    const regex = /^[a-zA-Z ]+$/;
    const key = event.key;
    if (!regex.test(key)) {
      // Prevent invalid keypress and show error
      event.preventDefault();
      const content = element.closest(".book-info__item__content");
      content.classList.add("book-invalid");
      bookToast("صفحه کلید را به انگلیسی تغییر دهید.");

      // element.closest(".book-info__item__container").insertAdjacentHTML('beforeend',
      //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">صفحه کلید را به انگلیسی تغییر دهید.</div>`);
      return false;
    }
    // Remove invalid state if valid key
    element
      .closest(".book-info__item__content")
      .classList.remove("book-invalid");
    return true;
  } catch (err) {
    console.error(
      `checkEnglishKey: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return false;
  }
};

/**
 * Capitalizes the first letter of each word in an input's value.
 * @param {Event} event - The input event (e.g., keyup).
 * @param {HTMLElement} element - The input element.
 */
const checkUpperCaseKey = (event, element) => {
  try {
    const elementSplited = element.value.split(" ");
    for (let i = 0; i < elementSplited.length; i++) {
      // Capitalize first letter of each word
      elementSplited[i] =
        elementSplited[i].charAt(0).toUpperCase() + elementSplited[i].slice(1);
    }
    element.value = elementSplited.join(" ");
  } catch (err) {
    console.error(
      `checkUpperCaseKey: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Validates that a keypress is a Persian character (excluding space).
 * @param {Event} event - The keydown event.
 * @param {HTMLElement} element - The input element.
 * @returns {boolean} True if valid Persian key, false otherwise.
 */
const checkPersianKey = (event, element) => {
  try {
    removeAlertContent(element);
    const regex = /^[\u0600-\u06FF\s]+$/;
    return regex.test(event.key) && event.key !== " ";
  } catch (err) {
    console.error(
      `checkPersianKey: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return false;
  }
};

/**
 * Global variables for keyboard navigation in dropdowns.
 */
let index = -1;
let itemSelected;

/**
 * Handles keyboard navigation for dropdown items.
 * @param {Event} e - The keydown event.
 */
const checkKey = (e) => {
  try {
    e = e || window.event;
    const passengerContainers = document.getElementsByClassName(
      "book-passenger__container"
    );
    for (let i = 0; i < passengerContainers.length; i++) {
      const dropContents = passengerContainers[i].getElementsByClassName(
        "book-drop__item__content"
      );
      for (let j = 0; j < dropContents.length; j++) {
        if (
          dropContents[j].classList.contains("book-drop__item__content-toggle")
        ) {
          // Filter visible items (not hidden)
          const items = Array.from(
            dropContents[j].getElementsByClassName("book-li-item")
          ).filter((item) => !item.classList.contains("book-hidden"));
          const len = items.length - 1;

          if (e.keyCode === 38) {
            // Up arrow
            if (itemSelected) {
              liNotSelected(itemSelected, "book-selected");
              index--;
              const next = items[index];
              if (typeof next !== "undefined" && index >= 0) {
                itemSelected = next;
              } else {
                index = len;
                itemSelected = items[len];
              }
              liNotSelected(itemSelected, "book-selected");
            } else {
              index = len;
              itemSelected = items[len];
              liNotSelected(itemSelected, "book-selected");
            }
          } else if (e.keyCode === 40) {
            // Down arrow
            index++;
            if (itemSelected) {
              const next = items[index];
              if (typeof next !== "undefined" && index <= len) {
                itemSelected = next;
              } else {
                index = 0;
                itemSelected = items[0];
              }
            } else {
              index = 0;
              itemSelected = items[0];
            }
            liSelected(itemSelected, "book-selected");
          } else if (e.keyCode === 13) {
            // Enter
            if (items[index]) {
              items[index].click();
              items[index].classList.remove("book-selected");
              index = -1;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(
      `checkKey: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

// Assign checkKey to global keydown event
document.onkeydown = checkKey;

/**
 * Marks a dropdown item as selected by adding a class.
 * @param {HTMLElement} el - The list item element.
 * @param {string} className - The class to add (e.g., 'book-selected').
 */
const liSelected = (el, className) => {
  try {
    if (el.classList) {
      if (el.previousElementSibling) {
        el.previousElementSibling.classList.remove(className);
      }
      el.classList.add(className);
    } else {
      el.className += " " + className;
    }
  } catch (err) {
    console.error(
      `liSelected: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Removes the selected state from a dropdown item.
 * @param {HTMLElement} el - The list item element.
 * @param {string} className - The class to remove (e.g., 'book-selected').
 */
const liNotSelected = (el, className) => {
  try {
    if (el.classList) {
      if (el.previousElementSibling) {
        el.previousElementSibling.classList.add(className);
      }
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(
        new RegExp(
          "(^|\\b)" + className.split(" ").join("|") + "(\\b|$)",
          "gi"
        ),
        " "
      );
    }
  } catch (err) {
    console.error(
      `liNotSelected: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Retrieves a cookie value by name.
 * @param {string} name - The name of the cookie.
 * @returns {string|null} The cookie value or null if not found.
 */
const getCookie = (name) => {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  } catch (err) {
    console.error(
      `getCookie: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return null;
  }
};

/**
 * Retrieves the value of a field or a default value.
 * @param {HTMLElement} element - The container element.
 * @param {string} selector - The CSS selector for the field.
 * @param {string} [defaultValue="-"] - The default value if field is not found.
 * @returns {string} The field value or default value.
 */
const getFieldValue = (element, selector, defaultValue = "-") => {
  try {
    const field = element.querySelector(selector);
    return field?.value || defaultValue;
  } catch (err) {
    console.error(
      `getFieldValue: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
    return defaultValue;
  }
};

/**
 * Handles selection of a dropdown item and updates related UI and data.
 * @param {HTMLElement} element - The selected list item.
 * @param {string} type - The container class type (e.g., 'info__item__container').
 * @param {string} [api] - Optional API identifier for triggering a data fetch.
 */
const selectDropItem = (element, type, api) => {
  try {
    removeAlertContent(element);
    const container = element.closest(`.${type}`);

    // Handle code number input case
    const codeNumber = container.querySelector(".book-code__number");
    if (codeNumber) {
      codeNumber.value = element.getAttribute("data-id");
      const input = container.querySelector("input");
      input.setAttribute("data-id", element.getAttribute("data-id"));
      input.value = element.getAttribute("data-id");
    } else {
      // Handle other input cases
      const input = container.querySelector("input");
      if (element.getAttribute("data-id")) {
        input.setAttribute("data-id", element.getAttribute("data-id"));
        if (container.classList.contains("book-counter__container")) {
          input.value = `${
            element.querySelector(".book-counter__firstName").textContent
          } ${element.querySelector(".book-counter__lastName").textContent}`;
        } else {
          input.value = element.getAttribute("data-value");
        }
      } else {
        input.value = element.innerText;
      }
    }

    // Update data-id field if present
    const dataIdField = container.querySelector(".book-data-id");
    if (dataIdField) {
      dataIdField.value = element.getAttribute("data-id");
    }

    // Close the dropdown
    container
      .querySelector(".book-drop__item__content")
      .classList.remove("book-drop__item__content-toggle");

    // Handle date item content
    if (type === "book-date__item__content") {
      createDate(element.closest(".book-date__item__content"));
    }

    // Handle PlaceOfBirth logic for NationalCode field
    const placeOfBirth = container.querySelector(".book-PlaceOfBirth");
    if (
      placeOfBirth &&
      element.closest(".book-passengers__container__external")
    ) {
      const nationalCode = element
        .closest(".book-passenger__container")
        .querySelector(".book-NationalCode");
      if (placeOfBirth.value === "1002236") {
        nationalCode.value = "";
        nationalCode.removeAttribute("readonly");
        nationalCode.classList.add("book-Required");
        nationalCode.classList.remove("book-not-active");
      } else {
        nationalCode.value = "-";
        nationalCode.setAttribute("readonly", true);
        nationalCode.classList.remove("book-Required");
        nationalCode.classList.add("book-not-active");
      }
    }

    // Handle gender-id-trust field in check__has__data
    if (container.classList.contains("book-check__has__data")) {
      const genderIdTrust = container.querySelector(".book-gender-id-trust");
      if (genderIdTrust) {
        genderIdTrust.dataset.changed = 1;
        genderIdTrust.value = element.getAttribute("data-trust");
      }
    }

    // Trigger API call if specified
    if (api) {
      const apiContainer = element.closest(".book-api__container");
      apiContainer
        .querySelector(".book-api__container__loader")
        .classList.remove("book-hidden");
      apiContainer.classList.add("book-rendering__info__api");
      $bc.setSource(`cms.${api}`, {
        id: element.querySelector(".book-id").value,
        run: true,
      });
      const requiredField = apiContainer.querySelector(".book-Required");
      if (requiredField) {
        requiredField.setAttribute(
          "data-id",
          element.querySelector(".book-id").value
        );
      }
    }
  } catch (err) {
    console.error(
      `selectDropItem: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
               
       * Shows the previous passengers UI and triggers data load if needed.
                * @param {HTMLElement} element - The element triggering the display (e.g., button).
                */
const showPreviousPassengers = (element) => {
  try {
    const mainUserId = document.querySelector(".main-userid").value;
    const loginSection = document.querySelector(".login-section-container");
    const layoutContainer = document.querySelector(".book-layout__main");
    const passengerInfoContent = element.closest(".book-passenger__container");
    const passengerIndex = passengerInfoContent.getAttribute("data-index");
    const isPassenger = element.closest(".book-passenger");
    const passengerIndexRoom = isPassenger
      ? element.closest(".book-passenger").getAttribute("data-index")
      : null;

    if (mainUserId === "0") {
      // Update form fields for login
      const forms = loginSection.getElementsByTagName("form");
      Array.from(forms).forEach((form) => {
        form.querySelector(".passengerList-key").value = 1;
        form.querySelector(".dmnid-key").value =
          layoutContainer.getAttribute("data-dmnid");
        form.querySelector(".index-key").value = passengerIndex;
        if (isPassenger) {
          form.querySelector(".index-room-key").value = passengerIndexRoom;
        }
      });
      showLoginContainer();
    } else {
      const prevPassengers = element.getAttribute("data-run") === "0";
      const passengerInfoElements = document.getElementsByClassName(
        "book-passenger__container"
      );

      if (prevPassengers) {
        // Show next sibling and set data-run for all passengers
        element.nextElementSibling.classList.remove("book-hidden");
        Array.from(passengerInfoElements).forEach((infoContent) => {
          if (!infoContent.parentElement.classList.contains("book-hidden")) {
            const passengers =
              infoContent.getElementsByClassName("book-passenger");
            if (passengers.length > 0) {
              Array.from(passengers).forEach((passenger) => {
                passenger
                  .querySelector(".book-previous__passenger__container")
                  .setAttribute("data-run", "1");
                passenger
                  .querySelector(".book-previous__passenger__container")
                  .classList.remove("book-selected__passenger");
              });
            } else {
              infoContent
                .querySelector(".book-previous__passenger__container")
                .setAttribute("data-run", "1");
              infoContent.classList.remove("book-selected__passenger");
            }
          }
        });
        let cookieValue = `; ${document.cookie}`;
        let cookieParts = cookieValue.split(`; rkey=`); // Split cookie to extract 'rkey'
        $bc.setSource("cms.previousPassengers", { rkey: cookieParts[1] });
        element
          .closest(".book-passenger__container")
          .classList.add("book-selected__passenger");
      } else {
        // Show previous passengers container and update selected state
        const previousPassengersContainer = document.querySelector(
          ".book-previous__passengers__container"
        );
        if (previousPassengersContainer.classList.contains("book-hidden")) {
          previousPassengersContainer.classList.remove("book-hidden");
        }
        Array.from(passengerInfoElements).forEach((infoContent) => {
          if (!infoContent.parentElement.classList.contains("book-hidden")) {
            const passengers =
              infoContent.getElementsByClassName("book-passenger");
            if (passengers.length > 0) {
              Array.from(passengers).forEach((passenger) => {
                passenger
                  .querySelector(".book-previous__passenger__container")
                  .classList.remove("book-selected__passenger");
              });
            } else {
              infoContent.classList.remove("book-selected__passenger");
            }
          }
        });
        element
          .closest(".book-passenger__container")
          .classList.add("book-selected__passenger");
      }
    }
  } catch (err) {
    console.error(
      `showPreviousPassengers: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Displays the booking summary and updates user data via API.
 * @param {HTMLElement} element - The element triggering the summary display.
 */
const showSummaryContent = (element) => {
  try {
    const summaryInfoContent = document.querySelector(
      ".book-summary__container"
    );
    const stepTitle = document.querySelector(".book-current__route__map");
    const summaryPassengerItems = document.querySelector(".book-summary__item");
    const summaryBuyerItems = document.querySelector(
      ".book-summary-buyer-items"
    );
    const summaryServiceItems = document.querySelector(
      ".book-summary-service-items"
    );
    const mainUserId = document.querySelector(".main-userid").value;

    // Show summary and update step
    summaryInfoContent.classList.remove("book-hidden");
    stepTitle.innerText = "پرداخت و صدور";
    element.setAttribute("data-step", "summary");
    element.previousElementSibling.setAttribute("data-step", "summary");
    updateStepItems("summary");

    // Reset summary items
    summaryPassengerItems.innerHTML = "";
    summaryBuyerItems.innerHTML = "";
    if (summaryServiceItems) {
      summaryServiceItems.innerHTML = "";
    }

    // Handle buyer info
    const buyerInfoContents = document.querySelectorAll(
      ".book-buyer__info__content"
    );
    buyerInfoContents.forEach((content) => {
      const numberItems = content.querySelectorAll(
        ".book-number__item__container"
      );
      numberItems.forEach((item) => {
        const telInput = item.querySelector(".book-tel");
        const mobileInput = item.querySelector(".book-mobile");
        const code = item.querySelector(".book-code");
        if (telInput) {
          const telInfo = item.querySelector(".book-tel__number");
          telInfo.value =
            telInput.value === "-" ? "-" : code.value + telInput.value;
        }
        if (mobileInput) {
          const mobileInfo = item.querySelector(".book-mobile__number");
          mobileInfo.value = code.value + mobileInput.value;
        }
      });
    });

    // Update properties for changed fields
    const properties = [];
    document.querySelectorAll(".book-check__has__data input").forEach((e) => {
      if (e.dataset.changed === "1") {
        const obj = {
          [e.dataset.id ? "edited" : "added"]: [
            {
              ...(e.dataset.id && { id: e.dataset.id }),
              parts: [
                {
                  part: 1,
                  values: [
                    {
                      ...(e.dataset.valueid && { id: e.dataset.valueid }),
                      value: e.value,
                    },
                  ],
                },
              ],
            },
          ],
          multi: false,
          propId: e.dataset.prpid || '""',
        };
        properties.push(obj);
      }
    });

    if (properties.length > 0) {
      const objEditUser = JSON.stringify({
        data: {
          lid: 1,
          paramUrl: `/${
            document.querySelector(".book-check__has__data").dataset.hashid
          }/fa/schema_name`,
          properties,
          schemaId: document.querySelector(".book-check__has__data").dataset
            .hashid,
          schemaVersion: "1.0.0",
          usedForId: mainUserId,
        },
      });
      $bc.setSource("cms.editUser", {
        objEditUser,
        rkey: getCookie("rkey"),
        run: true,
      });
    }

    // Handle passenger info
    const passengerInfoContents = document.querySelectorAll(
      ".book-passenger__container"
    );
    passengerInfoContents.forEach((content) => {
      if (!content.parentElement.classList.contains("book-hidden")) {
        const element = document.createElement("div");
        element.className =
          "book-summary__bodys book-grid book-grid-cols-4 book-gap-1";
        const numberItems = content.querySelectorAll(
          ".book-info__item__container"
        );

        numberItems.forEach((item) => {
          if (!item.classList.contains("book-hidden")) {
            const label = item
              .querySelector("label")
              .getAttribute("data-label");
            const inputValue = item.querySelector("input")
              ? item.querySelector("input").value
              : "";
            const hiddenInput = item.querySelector("input[type=hidden]");
            const hiddenInputValue = hiddenInput ? hiddenInput.value : "";
            const div = document.createElement("div");
            div.className = "book-mb-3";
            if (
              hiddenInput &&
              (hiddenInput.classList.contains("book-PlaceOfBirth") ||
                hiddenInput.classList.contains("book-PassportIssueCountry"))
            ) {
              div.innerHTML = `<div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div> 
                                                    <div class="book-summary__body book-font-bold">${inputValue}</div>`;
            } else {
              div.innerHTML = `<div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div> 
                                                    <div class="book-summary__body book-font-bold">${
                                                      hiddenInputValue ||
                                                      inputValue
                                                    }</div>`;
            }
            element.appendChild(div);
          }
        });

        const serviceLabel = content.getAttribute("data-label-service");
        const seatLabel = content.getAttribute("data-label-seat");

        if (serviceLabel) {
          const div = document.createElement("div");
          div.className = "book-mb-3";
          div.innerHTML = `
                <div class="book-summary__head book-text-zinc-500 book-mb-1">سرویس‌ها</div>
                <div class="book-summary__body book-font-bold">${serviceLabel}</div>`;
          element.appendChild(div);
        }

        if (seatLabel) {
          const div = document.createElement("div");
          div.className = "book-mb-3";
          div.innerHTML = `
                <div class="book-summary__head book-text-zinc-500 book-mb-1">صندلی انتخابی</div>
                <div class="book-summary__body book-font-bold">${seatLabel}</div>`;
          element.appendChild(div);
        }

        summaryPassengerItems.appendChild(element);
      }
    });

    // Handle buyer info
    const buyerItems = document.querySelector(".book-buyer__info__content");
    if (
      buyerItems &&
      !buyerItems.classList.contains("book-counter__info__content")
    ) {
      const element = document.createElement("div");
      element.className =
        "book-summary__bodys book-grid book-grid-cols-4 book-gap-1";
      const buyerNumberItems = buyerItems.querySelectorAll(
        ".book-info__item__container"
      );
      buyerNumberItems.forEach((item) => {
        if (!item.closest(".book-more__buyer__info__container")) {
          if (!item.classList.contains("book-hidden")) {
            const label = item.querySelector("label").innerText;
            const inputElement = item.querySelector("input");
            const hiddenInputElement = item.querySelector("input[type=hidden]");
            let dirClass = "book-rtl";
            let inputValue = inputElement ? inputElement.value : "";
            let hiddenInputValue = hiddenInputElement
              ? hiddenInputElement.value
              : "";
            if (
              inputElement &&
              inputElement.classList.contains("book-gender")
            ) {
              hiddenInputValue = inputValue === "0" ? "آقا" : "خانم";
            }
            if (
              inputElement &&
              (inputElement.classList.contains("book-mobile") ||
                inputElement.classList.contains("book-tel"))
            ) {
              dirClass = "book-ltr";
            }
            const hasSelectedAgencyClass =
              (inputElement &&
                inputElement.classList.contains("book-selected__agency")) ||
              (hiddenInputElement &&
                hiddenInputElement.classList.contains("book-selected__agency"));
            if (!hasSelectedAgencyClass) {
              const div = document.createElement("div");
              div.className = "book-mb-3";
              div.innerHTML = `<div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div> 
                                                    <div class="book-summary__body book-font-bold ${dirClass}">${
                hiddenInputValue || inputValue
              }</div>`;
              element.appendChild(div);
            }
          }
        }
      });
      summaryBuyerItems.appendChild(element);
    }

    // Handle specific domains and member point requests
    const domainId = document.querySelector(".book-layout__main").dataset.dmnid;

    if ([2452, 3812, 4204, 4787, 4705, 2475].includes(parseInt(domainId))) {
      const counterContent = document.querySelector(".book-counter__container");
      counterContent.style.display = "block";
      counterContent.classList.add("book-Required");
    }
  } catch (err) {
    console.error(
      `showSummaryContent: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Filters dropdown items based on input value for autocomplete functionality.
 * @param {HTMLElement} element - The input element.
 * @param {string} type - The container class type (e.g., 'info__item__container').
 */
const autoCompleteSearch = (element, type) => {
  try {
    const dropContent = element
      .closest(`.${type}`)
      .querySelector(".book-drop__item__content");
    // Show dropdown if not already visible
    if (!dropContent.classList.contains("book-drop__item__content-toggle")) {
      dropContent.classList.add("book-drop__item__content-toggle");
    }

    let count = 0;
    // Filter list items based on input value
    dropContent.querySelectorAll("li").forEach((e) => {
      const matches = e.dataset.value
        ? e.dataset.value.toLowerCase().includes(element.value.toLowerCase()) ||
          e.dataset.id.toLowerCase().includes(element.value.toLowerCase())
        : e.innerText.toLowerCase().includes(element.value.toLowerCase());
      if (matches) {
        count++;
        e.classList.remove("book-hidden");
      } else {
        e.classList.add("book-hidden");
      }
    });

    // Show "no data" message if no matches
    if (count === 0) {
      dropContent.insertAdjacentHTML(
        "beforeend",
        `<li class="book-nodata" data-value="" data-id="">موردی یافت نشد</li>`
      );
    } else {
      const noData = dropContent.querySelector(".book-nodata");
      if (noData) noData.remove();
    }
  } catch (err) {
    console.error(
      `autoCompleteSearch: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Clears input value if no data-id is set.
 * @param {HTMLElement} element - The input element.
 * @param {string} type - The container class type.
 */
const autoFillSearch = (element, type) => {
  try {
    if (element.getAttribute("data-id") === "") {
      element.value = "";
    }
  } catch (err) {
    console.error(
      `autoFillSearch: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Utility object for Jalali (Persian) date conversions.
 */
const JalaliDate = {
  g_days_in_month: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  j_days_in_month: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29],

  /**
   * Checks if a Jalali year is a leap year.
   * @param {number} year - The Jalali year.
   * @returns {boolean} True if leap year, false otherwise.
   */
  isLeapJalali(year) {
    const mod = year % 33;
    return [1, 5, 9, 13, 17, 22, 26, 30].includes(mod);
  },

  /**
   * Converts a Jalali date to Gregorian format.
   * @param {number} j_y - Jalali year.
   * @param {number} j_m - Jalali month (1-12).
   * @param {number} j_d - Jalali day.
   * @returns {string} Gregorian date in YYYY-MM-DD format.
   */
  JalaliToGregorian(j_y, j_m, j_d) {
    j_y = parseInt(j_y, 10);
    j_m = parseInt(j_m, 10) - 1;
    j_d = parseInt(j_d, 10) - 1;

    const jy = j_y - 979;
    let j_day_no =
      365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
    j_day_no +=
      this.j_days_in_month.slice(0, j_m).reduce((a, b) => a + b, 0) + j_d;

    let g_day_no = j_day_no + 79;
    let gy = 1600 + Math.floor(g_day_no / 146097) * 400;
    g_day_no %= 146097;

    let leap = true;
    if (g_day_no >= 36525) {
      g_day_no--;
      gy += Math.floor(g_day_no / 36524) * 100;
      g_day_no %= 36524;
      if (g_day_no >= 365) g_day_no++;
      else leap = false;
    }

    gy += Math.floor(g_day_no / 1461) * 4;
    g_day_no %= 1461;

    if (g_day_no >= 366) {
      leap = false;
      g_day_no--;
      gy += Math.floor(g_day_no / 365);
      g_day_no %= 365;
    }

    const monthLengths = [...this.g_days_in_month];
    if (leap) monthLengths[1] = 29;

    let gm, gd;
    for (gm = 0; g_day_no >= monthLengths[gm]; gm++) {
      g_day_no -= monthLengths[gm];
    }
    gd = g_day_no + 1;

    gm = String(gm + 1).padStart(2, "0");
    gd = String(gd).padStart(2, "0");

    return `${gy}-${gm}-${gd}`;
  },

  /**
   * Checks if a date string is a valid Persian date (YYYY-MM-DD).
   * @param {string} dateStr - The date string to validate.
   * @returns {boolean} True if valid Persian date, false otherwise.
   */
  isPersianDate(dateStr) {
    try {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      if (!regex.test(dateStr)) return false;

      const [year, month, day] = dateStr.split("-").map(Number);
      if (year < 1300 || year > 1500 || month < 1 || month > 12) return false;

      let maxDays = this.j_days_in_month[month - 1];
      if (month === 12 && this.isLeapJalali(year)) maxDays = 30;
      return day >= 1 && day <= maxDays;
    } catch (error) {
      console.error("isPersianDate: " + error.message);
      return false;
    }
  },
};

/**
 * Creates a date string from year, month, and day inputs and validates it.
 * @param {HTMLElement} element - The date container element.
 */
const createDate = (element) => {
  try {
    const container = element.closest(".book-info__item__container");
    const dateInput = container.querySelector(".book-date");
    // Set date value from year, month, and day
    dateInput.value =
      `${container.querySelector(".book-year").getAttribute("data-id")}-` +
      `${container.querySelector(".book-month").getAttribute("data-id")}-` +
      `${container.querySelector(".book-day").getAttribute("data-id")}`;

    // Remove invalid state
    element
      .querySelector("input")
      .closest(".book-info__item__content")
      .classList.remove("book-invalid");
    // Validate and convert date if all fields are filled
    if (
      container.querySelector(".book-year").value !== "" &&
      container.querySelector(".book-month").value !== "" &&
      container.querySelector(".book-day").value !== ""
    ) {
      const alertContent = container.querySelector(".book-alert__content");
      if (alertContent) {
        alertContent.remove();
      }
      if (
        element
          .closest(".book-date__item__container")
          .classList.contains("book-internal")
      ) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        const new_date = dateInput.value;
        const [check_year, check_month, check_day] = new_date
          .split("-")
          .map(Number);
        const leapYears = [
          1300, 1309, 1313, 1317, 1321, 1325, 1329, 1333, 1337, 1342, 1346,
          1350, 1354, 1358, 1362, 1366, 1370, 1375, 1379, 1383, 1387, 1391,
          1395, 1399, 1403, 1408, 1412, 1416, 1420, 1424, 1428, 1432, 1436,
          1441,
        ];

        function isLeapYearInList(check_year) {
          const year = parseFloat(check_year);
          return leapYears.includes(year);
        }

        if (check_month > 6 && check_day > 30) {
          return false;
        } else if (check_month === 12 && check_day === 30) {
          if (isLeapYearInList(check_year)) {
            if (
              parseFloat(check_year) > 1300 &&
              parseFloat(check_year) < 1500
            ) {
              checkDate(container);
            }
          } else {
            return false;
          }
        } else {
          if (parseFloat(check_year) > 1300 && parseFloat(check_year) < 1500) {
            checkDate(container);
          }
        }
      }
    }
  } catch (err) {
    console.error(
      `createDate: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Converts a Jalali date to Gregorian and updates the input value.
 * @param {HTMLElement} element - The container element with the date input.
 */
const checkDate = (element) => {
  try {
    if (JalaliDate.isPersianDate(element)) {
      const [j_y, j_m, j_d] = element.split("-").map(Number);
      return JalaliDate.JalaliToGregorian(j_y, j_m, j_d);
    }
    return element;
  } catch (error) {
    console.error("convertDateIfPersian: " + error.message);
    return element;
  }
};
/**
 * Processes flight API rule response and renders flight rules, baggage, or services.
 * @param {Object} args - API response object containing status and data.
 */
// Handle tab navigation click events for service selection
const selectServiceTab = (element, tabType, serviceType) => {
  // Get all navigation buttons and containers
  const buttons = document.querySelectorAll(".book-tab__navigation__content");
  const servicesContainer = element.closest(".book-services__container");
  const contentContainer = servicesContainer.querySelector(
    ".book-api__container__content"
  );

  // Validate containers
  if (!contentContainer) return;

  // Show loader and hide content
  contentContainer.classList.remove("book-hidden");

  // Remove active class from all buttons and hide all service containers
  buttons.forEach((button) =>
    button.classList.remove("book-active__tab__navigation")
  );
  ["baggageService", "mealService", "seatService"].forEach((type) => {
    const container = servicesContainer.querySelector(
      `.book-api__container__rendering__${type}`
    );
    if (container) container.classList.add("book-hidden");
  });

  // Add active class to clicked button
  element.classList.add("book-active__tab__navigation");
  contentContainer
    .querySelector(`.book-api__container__rendering__${tabType}`)
    ?.classList.remove("book-hidden");
  // Update data-run based on serviceType
  if (element.dataset.run === "0") {
    contentContainer.classList.add("book-api__container__rendering");
    if (!contentContainer.querySelector(".book-api__container__loader")) {
      const loader = document.createElement("span");
      loader.className =
        "book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-my-3";
      contentContainer.appendChild(loader);
    }
    // If serviceType is ExcessService, update data-run for both baggageService and mealService buttons
    if (serviceType === "ExcessService") {
      buttons.forEach((button) => {
        const buttonTabType = button
          .getAttribute("onclick")
          .match(/'([^']+)'/g)[1]
          .replace(/'/g, "");
        if (buttonTabType === "ExcessService") {
          button.dataset.run = "1";
        }
      });
    }
    element.dataset.run = "1";
    // Execute service request
    let cookieValue = `; ${document.cookie}`;
    let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
    let rkey = match ? match[1] : null;
    $bc.setSource("cms.rule", {
      type: `${serviceType}`,
      SessionId: sessionSearchStorage.SessionId,
      busId: sessionBookStorage.busId,
      busGroup: JSON.stringify(sessionBookStorage.busGroup),
      rkey: rkey,
      run: true,
    });
  }
};
/**
 * Selects a previous passenger and populates form fields with their data.
 * @param {HTMLElement} element - The selected passenger element.
 * @param {Event} event - The click event.
 * @param {string} firstName - Passenger's first name.
 * @param {string} lastName - Passenger's last name.
 * @param {string} nationalCode - Passenger's national code.
 * @param {string} birthDate - Passenger's birth date (YYYY-MM-DD).
 * @param {string} gender - Passenger's gender (1 for male, else female).
 * @param {string} issueCountryName - Country name.
 * @param {string} issueCountryId - Country ID.
 * @param {string} passportExpiration - Passport expiration date (YYYY-MM-DD).
 * @param {string} passportCode - Passport code.
 */
const selectPreviousPassenger = (
  element,
  event,
  firstName,
  lastName,
  nationalCode,
  birthDate,
  gender,
  issueCountryName,
  issueCountryId,
  passportExpiration,
  passportCode
) => {
  try {
    const selectedPassenger = document.querySelector(
      ".book-selected__passenger"
    );

    // Update basic passenger fields
    selectedPassenger.querySelector(".book-FirstName").value = firstName;
    selectedPassenger.querySelector(".book-LastName").value = lastName;

    // Set gender and corresponding data-id
    const genderField = selectedPassenger.querySelector(".book-Gender");
    const genderDataId = genderField
      .closest(".book-info__item__container")
      .querySelector(".book-data-id");
    if (gender == 1) {
      genderField.value = "آقا";
      genderDataId.value = "MR";
    } else {
      genderField.value = "خانم";
      genderDataId.value = "MS";
    }

    // Update national code and passport code
    selectedPassenger.querySelector(".book-NationalCode").value = nationalCode;
    selectedPassenger.querySelector(".book-PassportCode").value = passportCode;

    // Update passport expiration date
    const passportDateParts = passportExpiration.split("-");
    if (passportDateParts.length === 3) {
      const passportContainer = selectedPassenger
        .querySelector(".book-PassportExpiration")
        .closest(".book-date__item__container");
      selectedPassenger.querySelector(".book-PassportExpiration").value =
        passportExpiration;
      passportContainer.querySelector(".book-day").value = passportDateParts[2];
      passportContainer.querySelector(".book-day").dataset.id =
        passportDateParts[2];
      passportContainer.querySelector(".book-month").value =
        passportDateParts[1];
      passportContainer.querySelector(".book-month").dataset.id =
        passportDateParts[1];
      passportContainer.querySelector(".book-year").value =
        passportDateParts[0];
      passportContainer.querySelector(".book-year").dataset.id =
        passportDateParts[0];
    }

    // Update birth date
    const birthDateParts = birthDate.split("-");
    if (birthDateParts.length === 3) {
      const birthContainer = selectedPassenger
        .querySelector(".book-DateOfBirth")
        .closest(".book-date__item__container");
      selectedPassenger.querySelector(".book-DateOfBirth").value = birthDate;
      birthContainer.querySelector(".book-day").value = birthDateParts[2];
      birthContainer.querySelector(".book-day").dataset.id = birthDateParts[2];
      birthContainer.querySelector(".book-month").value = birthDateParts[1];
      birthContainer.querySelector(".book-month").dataset.id =
        birthDateParts[1];
      birthContainer.querySelector(".book-year").value = birthDateParts[0];
      birthContainer.querySelector(".book-year").dataset.id = birthDateParts[0];
    }

    // Update country and place of birth
    selectedPassenger.querySelector(".book-NameOfCountry").value =
      issueCountryName;
    selectedPassenger.querySelector(".book-PlaceOfBirth").value =
      issueCountryId;

    // Hide previous passengers UI
    element
      .closest(".book-previous__passengers__container")
      .classList.add("book-hidden");
    element.closest(".book-select__item__content").classList.add("book-hidden");
  } catch (err) {
    console.error(
      `selectPreviousPassenger: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Submits an invoice based on the specified type (pre-invoice, bank, or credit).
 * @param {HTMLElement} element - The element triggering the submission.
 * @param {string} type - The invoice type ('pre__Invoice', 'bank__Invoice', 'credit__Invoice').
 */
const submitInvoice = (element, type) => {
  try {
    const invoiceContainer = element.closest(".book-invoice__container");
    // Remove existing loader if present
    const existingLoader = invoiceContainer.querySelector(
      ".book-invoice__loader_container"
    );
    if (existingLoader) {
      existingLoader.remove();
    }

    if (type === "pre__Invoice") {
      // Handle pre-invoice submission
      const invoiceContent = invoiceContainer.querySelector(
        ".book-invoice__content"
      );
      invoiceContent.insertAdjacentHTML(
        "beforeend",
        `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال صدور پیش قرارداد، لطفا منتظر بمانید</div>`
      );
      invoiceContent.classList.add("book-not-active");
      document.querySelector(".book-bankIdentifier").value = -1;
      if (element.getAttribute("data-run") === "0") {
        element.setAttribute("data-run", "1");
        sendDataWithFetch();
      }
    } else if (element.getAttribute("data-run") === "0") {
      // Mark all invoice contents as processed
      const invoiceContents = invoiceContainer.getElementsByClassName(
        "book-invoice__content"
      );
      for (let i = 0; i < invoiceContents.length; i++) {
        invoiceContents[i].setAttribute("data-run", "1");
        invoiceContents[i].classList.add("book-not-active");
      }

      if (type === "bank__Invoice") {
        // Handle bank invoice submission
        document.querySelector(".book-payType").value = "bank";
        document.querySelector(".book-clear").value = 0;
        const bankId = element.querySelector(".book-bankId").value;
        document.querySelector(".book-bankIdentifier").value = bankId;
        if (bankId === "-1") {
          invoiceContainer.insertAdjacentHTML(
            "beforeend",
            `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال صدور پیش قرارداد، لطفا منتظر بمانید</div>`
          );
          sendDataWithFetch();
        } else if (bankId === "97") {
          // Handle SiBank-specific UI
          element.setAttribute("data-run", "0");
          element.classList.remove("book-not-active");
          invoiceContainer.insertAdjacentHTML(
            "beforeend",
            `<div class="book-get-bank-info-container book-get-bank-info-container-toggle">
                                                <div class="book-bg-get-bank-info-container"></div>
                                                <div class="book-main-get-bank-info-container">
                                                    <div class="book-get-bank-info-closed"><i class="book-fa book-fa-times" onclick="close_bank_info(this)"></i></div>
                                                    <p class="book-text-sm">کاربر گرامی, جهت استفاده از درگاه سیبانک لطفا تلفن همراه و کد ملی خود را وارد نمایید.</p>
                                                    <p class="book-text-sm book-get-bank-warning">لازم به ذکر است که تلفن همراه وارد شده باید متعلق به کد ملی ذکر شده باشد</p>
                                                    <div class="book-info__item__container book-mb-3 book-relative">
                                                        <label class="book-mb-1 book-block book-text-zinc-500 book-text-xs">تلفن همراه</label>
                                                        <div class="book-number__item__container">
                                                            <div class="book-info__item__content book-bg-zinc-100 book-rounded-lg book-w-11/12 book-transition">
                                                                <input type="text" class="book-mobileSiBank book-siBank-info" onkeyup="this.value=this.value.replace(/[^0-9]/g, '');">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="book-info__item__container book-mb-3 book-relative">
                                                        <label class="book-mb-1 book-block book-text-zinc-500 book-text-xs">کد ملی</label>
                                                        <div class="book-number__item__container">
                                                            <div class="book-info__item__content book-bg-zinc-100 book-rounded-lg book-w-11/12 book-transition">
                                                                <input type="text" class="book-nationalCodeSiBank book-siBank-info" onkeyup="this.value=this.value.replace(/[^0-9]/g, '');">
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button type="button" class="book-btn__content book-text-white book-rounded-2xl book-p-3 book-cursor-pointer book-text-center book-bg-primary-400 book-next__btn hover:book-bg-secondary-400" onclick="siBankIsSubmited(this,element)">ثبت و ارسال</button>
                                                </div>
                                            </div>`
          );
        } else {
          invoiceContainer.insertAdjacentHTML(
            "beforeend",
            `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال اتصال به درگاه بانک، لطفا منتظر بمانید</div>`
          );
          sendDataWithFetch();
        }
      } else if (type === "credit__Invoice") {
        // Handle credit invoice submission
        document.querySelector(".book-payType").value = "credit";
        document.querySelector(".book-clear").value = 6;
        invoiceContainer.insertAdjacentHTML(
          "beforeend",
          `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال صدور قرارداد، لطفا منتظر بمانید</div>`
        );
        sendDataWithFetch();
      }
    }
  } catch (err) {
    console.error(
      `submitInvoice: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Closes the SiBank info modal.
 * @param {HTMLElement} element - The element triggering the close action (e.g., close button).
 */
const close_bank_info = (element) => {
  try {
    element
      .closest(".book-get-bank-info-container")
      .classList.remove("book-get-bank-info-container-toggle");
  } catch (err) {
    console.error(
      `close_bank_info: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Submits SiBank info (mobile and national code) and triggers invoice submission.
 * @param {HTMLElement} element - The submit button element.
 * @param {HTMLElement} item - The original invoice element.
 */
const siBankIsSubmited = (element, item) => {
  try {
    let isExist = true;
    // Validate SiBank inputs
    element
      .closest(".book-get-bank-info-container")
      .querySelectorAll(".book-siBank-info")
      .forEach((e) => {
        if (e.value === "") {
          isExist = false;
          e.closest(".book-info__item__content").classList.add("book-invalid");
        } else {
          e.closest(".book-info__item__content").classList.remove(
            "book-invalid"
          );
        }
      });

    if (isExist) {
      // Add hidden inputs for SiBank data
      document.querySelector(".book-invoice-form").insertAdjacentHTML(
        "beforeend",
        `<input type="hidden" value="${
          element
            .closest(".book-get-bank-info-container")
            .querySelector(".book-mobileSiBank").value
        }" name="mobileSiBank"/>
                                     <input type="hidden" value="${
                                       element
                                         .closest(
                                           ".book-get-bank-info-container"
                                         )
                                         .querySelector(
                                           ".book-nationalCodeSiBank"
                                         ).value
                                     }" name="nationalCodeSiBank"/>`
      );
      // Close modal and show loader
      const invoiceContainer = element.closest(".book-invoice__container");
      invoiceContainer
        .querySelector(".book-get-bank-info-container")
        .classList.remove("book-get-bank-info-container-toggle");
      invoiceContainer.insertAdjacentHTML(
        "beforeend",
        `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال اتصال به درگاه بانک، لطفا منتظر بمانید</div>`
      );
      sendDataWithFetch();
      // Reset data-run and not-active state
      item.setAttribute("data-run", "0");
      item.classList.remove("book-not-active");
    }
  } catch (err) {
    console.error(
      `siBankIsSubmited: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Submits booking data via a dynamically created form.
 */

const sendDataWithFetch = () => {
  try {
    let passengerList = [];
    let buyerData = {};

    // Collect passenger data
    document
      .querySelectorAll(".book-passenger__container")
      .forEach((passengerElement) => {
        if (
          !passengerElement
            .closest(".book-passengers__content")
            .classList.contains("book-hidden")
        ) {
          const passengerData = {
            id: null,
            type: getFieldValue(passengerElement, ".book-Type", "ADT"),
            firstName: getFieldValue(passengerElement, ".book-FirstName"),
            lastName: getFieldValue(passengerElement, ".book-LastName"),
            gender: getFieldValue(
              passengerElement
                .querySelector(".book-Gender")
                .closest(".book-info__item__container"),
              ".book-data-id"
            ),
            passportCode: getFieldValue(passengerElement, ".book-PassportCode"),
            passportExpiration: getFieldValue(
              passengerElement,
              ".book-PassportExpiration"
            ),
            nationalCode: getFieldValue(passengerElement, ".book-NationalCode"),
            dateOfBirth: getFieldValue(passengerElement, ".book-DateOfBirth"),
            placeOfBirth: getFieldValue(passengerElement, ".book-PlaceOfBirth"),
            parentId: null,
            seatId: [getFieldValue(passengerElement, ".seat-id")],
          };
          // بررسی و اضافه کردن seatId در صورت وجود
          const seatIdAttr = passengerElement.getAttribute("data-seatId");
          if (seatIdAttr) {
            passengerData.Seat_Id = JSON.parse(seatIdAttr);
          }

          // بررسی و اضافه کردن serviceId در صورت وجود
          const serviceIdAttr = passengerElement.getAttribute("data-serviceId");
          if (serviceIdAttr) {
            passengerData.ServiceId = JSON.parse(serviceIdAttr);
          }
          passengerList.push(passengerData);
        }
      });

    // Collect buyer data based on account type
    const accountType = document.querySelector(".book-buyers__container")
      .dataset.accounttype;
    const mid = document.querySelector(".book-buyers__container").dataset.mid;
    if (Number(accountType) === 1) {
      if (Number(mid) === 24) {
        const buyerDataContent = document.querySelector(
          ".book-passenger-content"
        );
        buyerData = {
          fullname: {
            firstname: getFieldValue(buyerDataContent, ".book-firstname"),
            lastname: getFieldValue(buyerDataContent, ".book-lastname"),
          },
          email: getFieldValue(buyerDataContent, ".book-email"),
          tel: getFieldValue(buyerDataContent, ".book-tel__number"),
          mobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
          address: getFieldValue(buyerDataContent, ".book-address"),
          gender: getFieldValue(
            buyerDataContent
              .querySelector(".book-gender")
              .closest(".book-info__item__container"),
            ".book-data-id"
          ),
          countryid: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-countryid"
          ),
          cityid: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-cityid"
          ),
          namecounter: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-firstname"
          ),
          familycounter: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-lastname"
          ),
        };
      } else {
        const buyerDataContent = document.querySelector(
          ".book-buyer__agency__content"
        );
        buyerData = {
          agencyname: getFieldValue(buyerDataContent, ".book-Agencyname"),
          agencymanegername: getFieldValue(
            buyerDataContent,
            ".book-Agencymanegername"
          ),
          agencytell: getFieldValue(buyerDataContent, ".book-tel__number"),
          agencymobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
          agencyaddress: getFieldValue(buyerDataContent, ".book-address"),
          agencyemail: getFieldValue(buyerDataContent, ".book-email"),
          agencyweb: getFieldValue(buyerDataContent, ".book-web"),
          agencyfax: "-",
          agencyid: getFieldValue(buyerDataContent, ".book-agencyid"),
          countryid: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-countryid"
          ),
          cityid: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-cityid"
          ),
          namecounter: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-firstname"
          ),
          familycounter: getFieldValue(
            document.querySelector(".book-check__has__data"),
            ".book-lastname"
          ),
        };
      }
    } else if (Number(accountType) === 2) {
      const buyerDataContent = document.querySelector(
        ".book-buyer__type__content-2"
      );
      buyerData = {
        agencyname: getFieldValue(buyerDataContent, ".book-Agencyname"),
        agencymanegername: getFieldValue(
          buyerDataContent,
          ".book-Agencymanegername"
        ),
        namecounter: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-firstname"
        ),
        familycounter: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-lastname"
        ),
        emailcounter: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-email"
        ),
        mobilecounter: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-mobile__number"
        ),
        agencytell: getFieldValue(buyerDataContent, ".book-tel__number"),
        agencymobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
        agencyaddress: getFieldValue(buyerDataContent, ".book-address"),
        agencyemail: getFieldValue(buyerDataContent, ".book-email"),
        agencyweb: getFieldValue(buyerDataContent, ".book-web"),
        agencyfax: "-",
        agencyid: getFieldValue(buyerDataContent, ".book-agencyid"),
        countryid: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-countryid"
        ),
        cityid: getFieldValue(
          document.querySelector(".book-check__has__data"),
          ".book-cityid"
        ),
      };
    } else {
      const buyerDataContent = document.querySelector(".book-check__has__data");
      buyerData = {
        fullname: {
          firstname: getFieldValue(buyerDataContent, ".book-firstname"),
          lastname: getFieldValue(buyerDataContent, ".book-lastname"),
        },
        email: getFieldValue(buyerDataContent, ".book-email"),
        tel: getFieldValue(buyerDataContent, ".book-tel__number"),
        mobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
        address: getFieldValue(buyerDataContent, ".book-address"),
        gender: getFieldValue(
          buyerDataContent
            .querySelector(".book-gender")
            .closest(".book-info__item__container"),
          ".book-data-id"
        ),
        countryid: getFieldValue(buyerDataContent, ".book-countryid"),
        cityid: getFieldValue(buyerDataContent, ".book-cityid"),
      };
    }

    // Create form data
    const formData = {
      SessionId: sessionSearchStorage.SessionId,
      busId: sessionBookStorage.busId,
      busGroup: sessionBookStorage.busGroup,
      SchemaId: sessionSearchStorage.SchemaId,
      Travelers: passengerList,
      account: buyerData,
      agencycountername: document
        .querySelector(".book-counter__container")
        .querySelector(".book-name").value,
      agencycounter: document
        .querySelector(".book-counter__container")
        .querySelector(".book-name").dataset.id,
      clear: document.querySelector(".book-clear").value,
      payType: document.querySelector(".book-payType").value,
      bankIdentifier: document.querySelector(".book-bankIdentifier").value,
      accounttype: document.querySelector(".book-buyers__container").dataset
        .accounttype,
      mid: document.querySelector(".book-buyers__container").dataset.mid,
      code: document.querySelector(".book-coupon__code").value,
      club_discount: "",
      invoicedesc: document.querySelector(".book-invoicedesc").textContent,
      moduleType: "Bus",
    };

    // Create and submit form
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/book/final`;
    for (const key in formData) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value =
        typeof formData[key] === "object"
          ? JSON.stringify(formData[key])
          : formData[key];
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  } catch (err) {
    console.error(
      `sendDataWithFetch: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};

/**
 * Closes a modal container if the click is outside its content.
 * @param {HTMLElement} element - The modal container element.
 */
const closeModalContainer = (
  element,
  forceCloseClass = null,
  event = window.event
) => {
  try {
    if (!event) return;

    if (forceCloseClass && event.target.closest(`.${forceCloseClass}`)) {
      element.classList.add("book-hidden");
      return;
    }

    const content = element.querySelector(".book-modal__content");
    if (!content.contains(event.target)) {
      element.classList.add("book-hidden");
    }
  } catch (err) {
    console.error(
      `closeModalContainer: ${err.message}, Line: ${
        err.lineNumber || "unknown"
      }`
    );
  }
};

/**
 * Enhanced step navigation system that handles both flight and bus booking flows
 */

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
};

/**
 * Detects the current booking type based on page elements
 * @returns {string} 'flight' or 'bus'
 */
function detectBookingType() {
  // Check if seat selection container exists (bus specific)
  if (document.querySelector(".seat-selection-container")) {
    return "bus";
  }
  // You can add more detection logic here based on your specific indicators
  return "flight";
}

/**
 * Gets the current step configuration based on booking type
 * @returns {Object} Step configuration object
 */
function getCurrentStepConfig() {
  const bookingType = detectBookingType();
  return STEP_CONFIGS[bookingType];
}

/**
 * Gets the index of current step in the flow
 * @param {string} currentStep - Current step name
 * @returns {number} Step index
 */
function getCurrentStepIndex(currentStep) {
  const config = getCurrentStepConfig();
  return config.steps.indexOf(currentStep);
}

/**
 * Gets the next step in the flow
 * @param {string} currentStep - Current step name
 * @returns {string|null} Next step name or null if last step
 */
function getNextStep(currentStep) {
  const config = getCurrentStepConfig();
  const currentIndex = getCurrentStepIndex(currentStep);

  if (currentIndex >= 0 && currentIndex < config.steps.length - 1) {
    return config.steps[currentIndex + 1];
  }
  return null;
}

/**
 * Gets the previous step in the flow
 * @param {string} currentStep - Current step name
 * @returns {string|null} Previous step name or null if first step
 */
function getPreviousStep(currentStep) {
  const config = getCurrentStepConfig();
  const currentIndex = getCurrentStepIndex(currentStep);

  if (currentIndex > 0) {
    return config.steps[currentIndex - 1];
  }
  return null;
}

/**
 * Handles step transition with proper visibility control
 * @param {string} fromStep - Step to hide
 * @param {string} toStep - Step to show
 * @param {HTMLElement} element - Navigation element (could be prev or next button)
 */
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

/**
 * Enhanced nextStep function with multi-booking support
 * @param {HTMLElement} element - The element triggering the step transition
 */
const nextStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const bookingType = detectBookingType();

    if (bookingType === "bus" && currentStep === "passengers") {
      // Bus: Seat selection validation
      let isValid = true;
      const seatContainer = document.querySelector(".seat-selection-container");
      const seatError = seatContainer.querySelector(".book-alert__content");
      if (seatError) seatError.remove();

      // Check if at least one seat is selected and within limit
      if (typeof selectedSeats !== "undefined") {
        if (selectedSeats.length === 0) {
          bookToast("لطفاً حداقل یک صندلی انتخاب کنید.");

          // seatContainer.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفاً حداقل یک صندلی انتخاب کنید.</div>`);
          isValid = false;
        } else if (
          typeof maxSelectableSeats !== "undefined" &&
          selectedSeats.length > maxSelectableSeats
        ) {
          bookToast(
            `حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.`
          );

          // seatContainer.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">حداکثر ${maxSelectableSeats} صندلی می‌توانید انتخاب کنید.</div>`);
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
                bookToast("مشخصات مسافر را وارد کنید.");

                // e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
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
                    bookToast("مشخصات مسافر را وارد کنید.");

                    // e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">مشخصات مسافر را وارد کنید.</div>`);
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
        if (bookingType === "bus") {
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
        bookToast("لطفا قوانین و مقررات را تایید فرمایید");

        // ruleContent.insertAdjacentHTML('beforeend',
        //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا قوانین و مقررات را تایید فرمایید</div>`);
        isValid = false;
      }

      // Validate counter selection
      const counterContent = document.querySelector(".book-counter__container");
      removeDescription(counterContent);
      if (counterContent.classList.contains("book-Required")) {
        const counterName = counterContent.querySelector(".book-name").value;
        if (counterName === "") {
          bookToast("لطفا کانتر اقدام کننده را انتخاب فرمایید");

          // counterContent.insertAdjacentHTML('beforeend',
          //     `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2 book-float-right">لطفا کانتر اقدام کننده را انتخاب فرمایید</div>`);
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

      // if (isValid) {
      //   // Transition to invoice step
      //   const invoiceContainer = document.querySelector(
      //     ".book-invoice__container"
      //   );
      //   invoiceContainer.classList.remove("book-hidden");
      //   if (invoiceContainer.querySelectorAll(".book-invoice__content")[0]) {
      //     invoiceContainer
      //       .querySelectorAll(".book-invoice__content")
      //       .forEach((e) => {
      //         e.remove();
      //       });
      //   }
      //   if (invoiceContainer.querySelector(".book-api__container__loader")) {
      //     invoiceContainer
      //       .querySelector(".book-api__container__loader")
      //       .remove();
      //   }
      //   invoiceContainer.insertAdjacentHTML(
      //     "beforeend",
      //     `<span
      //                                             class="book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-m-3"></span>`
      //   );

      //   // Handle invoice rendering based on account type
      //   const accountType = document.querySelector(".book-buyers__container")
      //     .dataset.accounttype;
      //   // Commented out as per original code
      //   const share = sessionSearchStorage.share;
      //   if (Number(share) === 1) {
      //     invoiceContainer.innerHTML = `<div class="book-invoice__content book-pre__Invoice" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">جهت ثبت قرارداد کلیک کنید</div>`;
      //     document.querySelector(".book-bankIdentifier").value = -1;
      //   } else if (Number(accountType) === 1) {
      //     invoiceContainer.innerHTML = `<div class="book-invoice__content book-pre__Invoice book-text-xl book-text-center book-cursor-pointer" data-run="0" onclick="submitInvoice(this,'pre__Invoice')">جهت ثبت پیش قرارداد و ارسال به حسابداری کلیک کنید</div>`;
      //   } else {
      //     let cookieValue = `; ${document.cookie}`;
      //     let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
      //     let rkey = match ? match[1] : null;
      //     const { requests, productGroupField, productIdField } =
      //       getServiceMappingInfo(selectedMode);
      //     const userCreditUrl = requests.userCredit;
      //     $bc.setSource("cms.bankList", [
      //       {
      //         bank: utmSource === "safarmarket" ? "safarmarket" : "",
      //         rkey: rkey,
      //         selectedMode: selectedMode,
      //         userCreditUrl: userCreditUrl,
      //         run: true,
      //       },
      //     ]);
      //   }
      //   /* } */
      // }
    }
  } catch (err) {
    console.error(
      `nextStep: ${err.message}, Line: ${err.lineNumber || "unknown"}`
    );
  }
};
/**
 * Enhanced prevStep function with multi-booking support
 * @param {HTMLElement} element - The element triggering the step transition
 */
const prevStep = (element) => {
  try {
    const currentStep = element.getAttribute("data-step");
    const previousStep = getPreviousStep(currentStep);

    if (!previousStep) {
      // Already at first step
      return;
    }

    // Handle special cases for going back
    // if (currentStep === "summary") {
    //   // Reset coupon if applicable
    //   const couponResponse = document.querySelector(
    //     ".book-coupon__container .book-response-code"
    //   );
    //   if (couponResponse && couponResponse.classList.contains("book-true")) {
    //     const couponCode = document.querySelector(".book-coupon__code");
    //     const couponButton = document.querySelector(
    //       ".book-coupon__container button"
    //     );
    //     if (couponCode) couponCode.value = "";
    //     if (couponButton) couponButton.click();
    //   }

    //   // Hide invoice container if visible
    //   const summaryInvoice = document.querySelector(".book-invoice__container");
    //   if (summaryInvoice && !summaryInvoice.classList.contains("book-hidden")) {
    //     summaryInvoice.classList.add("book-hidden");
    //   }

    //   // Remove error messages
    //   ["book-company__rule__container", "book-counter__container"].forEach(
    //     (className) => {
    //       const description = document.querySelector(
    //         `.${className} .book-alert__content`
    //       );
    //       if (description) description.remove();
    //     }
    //   );
    // }

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
    if (bookingType === "bus" && previousStep === "passengers") {
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

/**
 * Renders the seat selection map based on provided layout.
 * @param {Object} args - Contains the response with seat layout data.
 */
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
              bookToast(
                `شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.`
              );
              // alert(`شما فقط مجاز به انتخاب ${maxSelectableSeats} صندلی هستید.`);
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

/**
 * Handles seat selection logging (placeholder for further logic).
 * @param {Object} seat - The seat object being selected or deselected.
 */
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

/**
 * Handles click events to close dropdowns and hide select item content when clicking outside specific elements.
 */
const handleClickOutside = (event) => {
    try {
        // Close all dropdowns if click is outside input or dropdown content
        if (!event.target.closest('.book-has__drop__item input, .book-has__drop__item .book-drop__item__content')) {
            document.querySelectorAll(".book-drop__item__content").forEach(e => {
                e.classList.remove("book-drop__item__content-toggle");
            });
        }

        // Hide select item content in previous passengers container if click is outside select container
        if (!event.target.closest('.book-select__item__container')) {
            const previousPassengersContainer = document.querySelector(".book-previous__passengers__container");
            if (previousPassengersContainer) {
                previousPassengersContainer.querySelectorAll(".book-select__item__content").forEach(e => {
                    e.classList.add("book-hidden");
                });
            }
        }
    } catch (error) {
        console.error("handleClickOutside: " + error.message);
    }
}

// Attach the click event listener to the document
document.addEventListener('click', handleClickOutside);
if (typeof gridPreviousPassengers === "undefined") {
    var gridPreviousPassengers = {
        columns: {
            firstName: {
                title: `${translate("first_name")}`,
                filter: true,
                sort: false,
            },
            lastName: {
                title: `${translate("last_name")}`,
                filter: true,
                sort: false,
            },
            nationalCode: {
                title: `${translate("national_code")}`,
                filter: true,
                sort: false,
            },
            birthDate: {
                title: `${translate("birth_date")}`,
                filter: true,
                sort: true,
            },
            passportCode: {
                title: `${translate("passport_code")}`,
                filter: true,
                sort: false,
            },
            operation: {
                title: `${translate("operation")}`,
                filter: false,
                sort: false,
                cellMaker: (row, data, td) => {
                    return `<div class="book-select__item__container book-relative">
                                                        <div class="book-icon book-cursor-pointer" onclick="toggleSelectItem(this)">
                                                            <svg width="6" height="20" viewBox="0 0 6 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <use xlink:href="/booking/images/sprite-booking-icons.svg#details-icon">
                                                                </use></svg>
                                                        </div>
                                                        <div class="book-select__item__content book-absolute book-left-0 book-right-0 book-mx-auto book-hidden book-z-10">
                                                            <button class="book-select__item__btn book-inline-block book-w-16 book-bg-zinc-300 hover:book-bg-zinc-200  book-text-white book-text-xs book-cursor-pointer book-rounded" onclick="selectPreviousPassenger(this,event, '${row.firstName}', '${row.lastName}', '${row.nationalCode}', '${row.birthDate}', '${row.gender}', '${row.issueCountryName}', '${row.issueCountryId}', '${row.passportExpiration}', '${row.passportCode}', '${row.persianFirstName}', '${row.persianLastName}')">
                                                                ${translate("operation")}
                                                            </button>
                                                          
                                                        </div>
                                                    </div>
                                            `;
                },
            }
        },
        filter: 'row',
        rowNumber: `${translate("row_number")}`,
        defaultSort: false,
        direction: "rtl",
        paging: 10,
        information: true,
        firstAndLastBtn: true,
        culture: {
            labels: {
                "refresh": "",
                "next": `${translate("next")}`,
                "previous": `${translate("previous")}`,
                "first": `${translate("first")}`,
                "last": `${translate("last")}`,
                "information": "نمایش ${from} تا ${to} از مجموع ${total}"
            }
        },
        noData: (td) => {
            td.innerHTML = `<div class="noData"><div class="text" style="padding-top: 10px;">${translate("no_data")}</div></div>`
        },
        mode: "grid",
        pageCount: false,
        refresh: true
    };
};

if (typeof mobGridPreviousPassengers === "undefined") {
    var mobGridPreviousPassengers = {
        columns: {
            firstName: {
                title: `${translate("first_name")}`,
                filter: true,
                sort: false,
            },
            lastName: {
                title: `${translate("last_name")}`,
                filter: true,
                sort: false,
            },
            nationalCode: {
                title: `${translate("national_code")}`,
                filter: true,
                sort: false,
            },
            birthDate: {
                title: `${translate("birth_date")}`,
                filter: true,
                sort: true,
            },
            passportCode: {
                title: `${translate("passport_code")}`,
                filter: true,
                sort: false,
            },
            operation: {
                title: `${translate("operation")}`,
                filter: false,
                sort: false,
                cellMaker: (row, data, td) => {
                    return `<div class="book-select__item__container book-relative">
                                                        <div class="book-icon book-cursor-pointer" onclick="toggleSelectItem(this)">
                                                            <svg width="6" height="20" viewBox="0 0 6 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <use xlink:href="/booking/images/sprite-booking-icons.svg#details-icon">
                                                                </use></svg>
                                                        </div>
                                                        <div class="book-select__item__content book-absolute book-left-0 book-right-0 book-mx-auto book-hidden book-z-10">
                                                            <button class="book-select__item__btn book-inline-block book-w-16 book-bg-zinc-300 hover:book-bg-zinc-200  book-text-white book-text-xs book-cursor-pointer book-rounded" onclick="selectPreviousPassenger(this,event, '${row.firstName}', '${row.lastName}', '${row.nationalCode}', '${row.birthDate}', '${row.gender}', '${row.issueCountryName}', '${row.issueCountryId}', '${row.passportExpiration}', '${row.passportCode}', '${row.persianFirstName}', '${row.persianLastName}')">
                                                                ${translate("operation")}
                                                            </button>
                                                          
                                                        </div>
                                                    </div>
                                            `;
                },
            }
        },
        filter: 'row',
        rowNumber: `${translate("row_number")}`,
        defaultSort: false,
        direction: "rtl",
        paging: 10,
        information: true,
        firstAndLastBtn: true,
        culture: {
            deviceId: 2,
            template: "template3",
            labels: {
                "refresh": "",
                "next": `${translate("next")}`,
                "previous": `${translate("previous")}`,
                "first": `${translate("first_page")}`,
                "last": `${translate("last_page")}`,
                "information": "نمایش ${from} تا ${to} از مجموع ${total}"
            }
        },
        noData: (td) => {
            td.innerHTML = `<div class="noData"><div class="text" style="padding-top: 10px;">${translate("no_data")}</div></div>`
        },
        mode: "grid",
        pageCount: false,
        refresh: true
    };
};
/**
 * Returns the mapping information for a given selectedMode (e.g., "flight", "bus").
 * Throws an error if requestMappingCache is not loaded or the mode is unsupported.
 *
 * @param {string} selectedMode - Mode of the service (e.g., "flight", "bus").
 * @returns {Object} - Contains requests, productGroupField, and productIdField.
 */
const getServiceMappingInfo = (selectedMode) => {
    if (!requestMappingCache) {
        throw new Error("Request mapping data not loaded yet.");
    }

    const serviceType = selectedMode.toLowerCase();
    const currentMapping = requestMappingCache[serviceType];

    if (!currentMapping) {
        throw new Error("Unsupported service type: " + serviceType);
    }

    const { requests, productGroupField, productIdField } = currentMapping;

    return {
        requests,
        productGroupField,
        productIdField
    };
};

const getPersianYear = (gregorianYear) => {
    try {
        return gregorianYear - 621; // Approximate conversion
    } catch (error) {
        console.error("getPersianYear: " + error.message);
        return 0;
    }
};

const getCurrentPersianYear = () => {
    try {
        const today = new Date();
        return getPersianYear(today.getFullYear());
    } catch (error) {
        console.error("getCurrentPersianYear: " + error.message);
        return 0;
    }
};

const getCurrentGregorianYear = () => {
    try {
        const today = new Date();
        return today.getFullYear();
    } catch (error) {
        console.error("getCurrentGregorianYear: " + error.message);
        return 0;
    }
};

const generateDays = (dropdownId) => {
    try {
        const dayDropdown = document.getElementById(dropdownId);
        dayDropdown.innerHTML = '';
        for (let i = 1; i <= 31; i++) {
            const li = document.createElement('li');
            const id = i < 10 ? `0${i}` : `${i}`;
            li.className = 'book-li-item book-cursor-pointer book-p-2';
            li.setAttribute('data-id', id);
            li.setAttribute('data-value', i);
            li.textContent = i;
            li.setAttribute('onclick', "selectDropItem(this, 'book-date__item__content')");
            // li.onclick = function () { selectDropItem(this, 'book-date__item__content'); };
            dayDropdown.appendChild(li);
        }
    } catch (error) {
        console.error("generateDays: " + error.message);
        return "";
    }
};

const generateMonths = (dropdownId, isGregorian = false) => {
    try {
        const months = isGregorian
            ? [
                { id: '01', value: 'January', switch: 'فروردین' },
                { id: '02', value: 'February', switch: 'اردیبهشت' },
                { id: '03', value: 'March', switch: 'خرداد' },
                { id: '04', value: 'April', switch: 'تیر' },
                { id: '05', value: 'May', switch: 'مرداد' },
                { id: '06', value: 'June', switch: 'شهریور' },
                { id: '07', value: 'July', switch: 'مهر' },
                { id: '08', value: 'August', switch: 'آبان' },
                { id: '09', value: 'September', switch: 'آذر' },
                { id: '10', value: 'October', switch: 'دی' },
                { id: '11', value: 'November', switch: 'بهمن' },
                { id: '12', value: 'December', switch: 'اسفند' }
            ]
            : [
                { id: '01', value: 'فروردین', switch: 'January' },
                { id: '02', value: 'اردیبهشت', switch: 'February' },
                { id: '03', value: 'خرداد', switch: 'March' },
                { id: '04', value: 'تیر', switch: 'April' },
                { id: '05', value: 'مرداد', switch: 'May' },
                { id: '06', value: 'شهریور', switch: 'June' },
                { id: '07', value: 'مهر', switch: 'July' },
                { id: '08', value: 'آبان', switch: 'August' },
                { id: '09', value: 'آذر', switch: 'September' },
                { id: '10', value: 'دی', switch: 'October' },
                { id: '11', value: 'بهمن', switch: 'November' },
                { id: '12', value: 'اسفند', switch: 'December' }
            ];
        const monthDropdown = document.getElementById(dropdownId);
        monthDropdown.innerHTML = '';
        months.forEach(month => {
            const li = document.createElement('li');
            li.className = 'book-li-item book-cursor-pointer book-p-2';
            li.setAttribute('data-id', month.id);
            li.setAttribute('data-value', month.value);
            li.setAttribute('data-switch', month.switch);
            li.textContent = month.value;
            li.setAttribute('onclick', "selectDropItem(this, 'book-date__item__content')");
            monthDropdown.appendChild(li);
        });
    } catch (error) {
        console.error("generateMonths: " + error.message);
        return "";
    }
};

const generateYears = (dropdownId, isGregorian = false, isFuture = false) => {
    try {
        const yearDropdown = document.getElementById(dropdownId);
        yearDropdown.innerHTML = '';
        if (isGregorian) {
            const currentGregorianYear = getCurrentGregorianYear();
            const startYear = isFuture ? currentGregorianYear : currentGregorianYear - 100;
            const endYear = isFuture ? currentGregorianYear + 20 : currentGregorianYear;
            for (let i = startYear; i <= endYear; i++) {
                const persianYear = getPersianYear(i);
                const li = document.createElement('li');
                li.className = 'book-li-item book-cursor-pointer book-p-2';
                li.setAttribute('data-id', i);
                li.setAttribute('data-value', i);
                li.setAttribute('data-switch', persianYear);
                li.textContent = i;

                li.setAttribute('onclick', "selectDropItem(this, 'book-date__item__content')");
                yearDropdown.appendChild(li);
            }
        } else {
            const currentPersianYear = getCurrentPersianYear();
            const startYear = isFuture ? currentPersianYear : currentPersianYear - 100;
            const endYear = isFuture ? currentPersianYear + 20 : currentPersianYear;
            for (let i = startYear; i <= endYear; i++) {
                const gregorianYear = i + 621; // Approximate conversion to Gregorian
                const li = document.createElement('li');
                li.className = 'book-li-item book-cursor-pointer book-p-2';
                li.setAttribute('data-id', i);
                li.setAttribute('data-value', i);
                li.setAttribute('data-switch', gregorianYear);
                li.textContent = i;
                li.setAttribute('onclick', "selectDropItem(this, 'book-date__item__content')");
                yearDropdown.appendChild(li);
            }
        }
    } catch (error) {
        console.error("generateYears: " + error.message);
        return "";
    }
};



function bookToast(text) {
  try {
    // استک توست‌ها (در اولین اجرا ساخته می‌شود)
    let stack = document.getElementById("book-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "book-toast-stack";
      stack.className =
        "book-fixed book-right-6 book-top-6 book-z-50 book-space-y-3 " +
        "book-pointer-events-none"; // تا کلیک‌های زیرین قابل دسترسی بماند
      document.body.appendChild(stack);
    }

    // خود توست
    const toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className =
      "book-pointer-events-auto book-max-w-md " +
      "book-font-bold book-border-2 book-bg-red-300 book-text-red-600 book-border-red-600 book-rounded-lg " +
      "book-shadow-lg book-text-sm book-leading-6 " +
      "book-px-4 book-py-3 " +
      "book-opacity-0 book-translate-y-2 " + // حالت اولیه برای انیمیشن ورود
      "book-transition book-duration-300 book-ease-out";
    toast.textContent = text;

    // بستن با کلیک (اختیاری)
    toast.addEventListener("click", () => dismiss());

    // اضافه به استک
    stack.appendChild(toast);

    // انیمیشن ورود
    requestAnimationFrame(() => {
      toast.classList.remove("book-opacity-0", "book-translate-y-2");
    });

    // تایمر اتومات خروج
    const LIFE = 4000; // میلی‌ثانیه
    const t = setTimeout(() => dismiss(), LIFE);

    function dismiss() {
      clearTimeout(t);
      toast.classList.add("book-opacity-0", "book-translate-y-2");
      toast.addEventListener(
        "transitionend",
        () => {
          toast.remove();
          // اگر استک خالی شد، خودش هم پاک شود
          if (!stack.children.length) stack.remove();
        },
        { once: true }
      );
    }
  } catch (err) {
    console.error("bookToast error:", err);
  }
}
