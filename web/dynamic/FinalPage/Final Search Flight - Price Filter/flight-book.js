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
/**
 * Event listener for DOM content loaded to initialize the session booking process.
 * Loads data from sessionStorage, sets up UI, and triggers initial actions.
 */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize translation
        await loadTranslations();

        gridPreviousPassengers = {
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

        mobGridPreviousPassengers = {
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


        // Initialize direction styles
        await applyDirectionStyles();
        // BirthDate Persian
        generateDays('birth-persian-day-dropdown');
        generateMonths('birth-persian-month-dropdown', false);
        generateYears('birth-persian-year-dropdown', false, false);

        // BirthDate Gregorian
        generateDays('birth-gregorian-day-dropdown');
        generateMonths('birth-gregorian-month-dropdown', true);
        generateYears('birth-gregorian-year-dropdown', true, false);

        // PassportDate Persian
        generateDays('passport-persian-day-dropdown');
        generateMonths('passport-persian-month-dropdown', false);
        generateYears('passport-persian-year-dropdown', false, true);

        // PassportDate Gregorian
        generateDays('passport-gregorian-day-dropdown');
        generateMonths('passport-gregorian-month-dropdown', true);
        generateYears('passport-gregorian-year-dropdown', true, true);
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

        // Check if the UTM source is 'safarmarket'
        if (utmSource === "safarmarket") {
            // Extract flight_id, route_key, and safarmarketId from URL
            const flightId = urlParams.get("flight_id") || "";
            const routeKey = urlParams.get("route_key") || "";
            const safarmarketId = urlParams.get("safarmarketId") || "";

            // Set safarmarket-specific data source
            $bc.setSource("cms.flightSafarmarket", [{
                flight_key: flightId,
                route_key: routeKey,
                run: true
            }]);

            // Add class and HTML banner to main container
            const container = document.querySelector(".book-if__hero");
            if (container) {
                const bannerHTML = `
                <div class="book-bg-orange-500 book-leading-6 book-text-white book-text-sm book-rounded-2xl book-p-4 book-text-center book-font-bold book-mb-4">
                    شما از موتور جستجوی <span class="book-bg-white book-text-orange-500 book-px-2 book-py-1 book-rounded-md">سفرمارکت</span> به این سایت هدایت شده‌اید.
                </div>`;
                container.insertAdjacentHTML("afterbegin", bannerHTML);
            }

            // Store flight_id in cookie for 7 days with name 'safarmarketId'
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
            // document.cookie = `safarmarketId=${safarmarketId}; path=/; expires=${expiryDate.toUTCString()}; Secure; SameSite=Lax`;
            document.cookie = `safarmarketId=${safarmarketId}; path=/; expires=${expiryDate.toUTCString()};`;

            // Clear sessionStorage keys that are no longer needed
            sessionStorage.removeItem("sessionSearch");
            sessionStorage.removeItem("sessionAmenities");

        } else if (sessionStorage.getItem("sessionSearch")) {
            // Parse stored flight search data
            sessionSearchStorage = JSON.parse(sessionStorage.getItem("sessionSearch"));
            // Initialize selectedMode 
            selectedMode = sessionSearchStorage.Type;

            // If booking type is AI, set AI source and update research button
            if (sessionSearchStorage?.Mode === "AI") {
                $bc.setSource("cms.flightAi", [{
                    TokenId: sessionSearchStorage.TokenId,
                    FlightId: sessionSearchStorage.FlightId,
                    run: true
                }]);

                document.querySelector(".book-research__btn__container")
                    .setAttribute("onclick", "window.location='/book/ai'");
            } else {
                // If not AI, load regular flight booking data
                sessionBookStorage = sessionStorage.getItem("sessionBook")
                    ? JSON.parse(sessionStorage.getItem("sessionBook"))
                    : "";
                setFlightGroup();
            }
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
    const response = await fetch('/json/request');

    // Parse the JSON response into a JavaScript object
    const data = await response.json();

    // Store the data in the cache for future use
    requestMappingCache = data;

    // Return the loaded data
    return data;
};
/**
* Renders detailed route information for a flight group, including airline, baggage, and flight details.
* @param {Object} element - The flight group data containing FlightGroup and Baggages.
* @returns {Promise<string>} HTML string representing detailed route information.
*/
const renderRoutesInfoMob = async (element) => {
    try {
        /**
         * Renders airline information with an icon, label, and value.
         * @param {string} icon - The icon identifier for the SVG sprite.
         * @param {string} label - The label for the airline information.
         * @param {string} value - The value to display.
         * @returns {string} HTML string for airline information or empty string if value is invalid.
         */
        const renderAirlineInfo = (icon, label, value) => {
            if (value && value !== "") {
                return `
                  <div class="book-text-sm">
                      <div class="book-w-8 book-h-8 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded">
                           <svg width="25" height="24" class="book-fill-primary-400">
                              <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
                          </svg>
                      </div>
                      <div>
                          <p class="book-text-zinc-500 book-my-1">${label}:</p>
                          <p class="book-text-zinc-900">${value}</p>
                      </div>
                  </div>`;
            }
            return "";
        };

        /**
         * Renders HTML for a single route with flight details and optional title for first route in group.
         * @param {Object} item - Route information.
         * @param {Object} baggage - Baggage information for the route.
         * @param {number} index - Index of the route.
         * @param {boolean} isFirstInGroup - Whether this is the first route in the group.
         * @param {number} groupIndex - Index of the flight group.
         * @returns {Promise<string>} HTML string for the route.
         */
        const routeHtml = async (item, baggage, index, isFirstInGroup, groupIndex) => {
            let titleDiv = "";
            if (isFirstInGroup && index === 0) {
                if (schemaId === 290) {
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${groupIndex === 0 ? translate("outbound_flight") : translate("return_flight")}
            </div>`;
                } else if (schemaId === 292) {
                    const routeNames = [translate("first_route"), translate("second_route"), translate("third_route"), translate("fourth_route")];
                    const name = `${translate("route")} ${routeNames[groupIndex]}`;
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${name}
            </div>`;
                }
            }

            return `
          <div class="book-route__info">
              ${titleDiv}
              <div class="book-mb-2">
                  <div class="book-flex book-items-stretch">
                      <div class="book-flight__details__progress__line book-bg-zinc-300 book-ml-4 book-mr-2 book-relative">
                          <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-top-1.2 book--translate-y-1.2 book-z-10">
                              <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
                          </svg>
                      </div>
                      <div class="book-flex book-flex-col book-px-3 book-items-stretch book-w-full">
                          <div class="book-border-b book-border-zinc-300 book-mb-3 book-pb-4">
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900">${item.OriginAirport}</h5>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900 book-my-1">${item.DepartureTime}</h5>
                              <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.DepartureDate)}</p>
                          </div>
                          <div>
                              <h6 class="book-text-sm book-text-zinc-900">${await renderAirport(item.OriginAirport)}</h6>
                              <p class="book-text-zinc-600 book-text-sm book-my-2">
                                  ${await renderCity(item.OriginAirport)}, ${await renderCountry(item.OriginAirport)}
                              </p>
                              <div class="book-flex book-text-sm book-items-center book-gap-2">
                                  <div>
                                      ${await renderAirlineLogo(item.AirlineCode, '5', '50', '20')}
                                  </div>
                                  <span class="book-text-zinc-900 book-text-sm">
                                      ${await renderAirlineName(item.AirlineCode)} ${item.FlightNumber}
                                  </span>
                              </div>
                              ${await renderOperatingAirlineCode(item)}
                          </div>
                          <div class="book-text-sm book-text-primary-400 book-my-3">
                              <span class="${isRTL ? 'book-ml-1' : 'book-mr-1'}">${await renderFormatterDuration(item.Duration)}</span>${translate("flight_duration")}
                          </div>
                          <div class="book-flex book-gap-5 book-my-3">
                                ${renderAirlineInfo("class-details-icon", translate("ticket_class"), `${await renderFlightClass(item.Class)}`)}
                                ${renderAirlineInfo("wheel-bag-details-icon", translate("allowed_baggage"), await renderBaggages(baggage))}
                                ${renderAirlineInfo("ticket-details-icon", translate("fare_class"), item.ClassCode)}
                                ${renderAirlineInfo("plane-details-icon", translate("aircraft_type"), item.AirCraft)}
                          </div>
                          <div class="book-border-b book-border-zinc-300 book-my-3 book-pb-4">
                              <h6 class="book-text-sm book-text-zinc-900">${await renderAirport(item.DestinationAirport)}</h6>
                              <p class="book-text-zinc-600 book-text-sm book-my-2">
                                  ${await renderCity(item.DestinationAirport)}, ${await renderCountry(item.DestinationAirport)}
                              </p>
                          </div>
                          <div>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900">${item.DestinationAirport}</h5>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900 book-my-1">${item.ArrivalTime}</h5>
                              <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.ArrivalDate)}</p>
                          </div>
                      </div>
                  </div>
              </div>
              ${await renderConnectionTime(item.ConnectionTime)}
          </div>`;
        };

        let output = "";
        for (let groupIndex = 0; groupIndex < (element.FlightGroup || []).length; groupIndex++) {
            const flightGroup = element.FlightGroup[groupIndex];

            const routeHtmls = await Promise.all(
                (flightGroup.RoutesInfo || []).map((item, i) =>
                    routeHtml(item, element.Baggages?.[i], i, true, groupIndex)
                )
            );

            output += routeHtmls.join('');
        }

        return output;
    } catch (error) {
        console.error(`renderRoutesInfoMob: ${error.message}`);
        return "";
    }
};
const renderRoutesInfoPc = async (element) => {
    try {
        const renderAirlineInfo = (icon, labelKey, value) => {
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
                                <p class="book-text-zinc-500 book-my-2">${translate(labelKey)}:</p>
                                <p class="book-text-zinc-900">${value}</p>
                            </div>
                        </div>`;
                }
                return "";
            } catch (error) {
                console.error("renderAirlineInfo: " + error.message);
                return "";
            }
        };

        const routeHtml = async (item, baggage, index, isFirstInGroup, groupIndex) => {
            let titleDiv = "";
            if (isFirstInGroup && index === 0) {
                if (schemaId === 290) {
                    const titleKey = groupIndex === 0 ? "flight_outbound" : "flight_inbound";
                    titleDiv = `
                        <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                            ${translate(titleKey)}
                        </div>`;
                } else if (schemaId === 292) {
                    const routeKeys = ["route_1", "route_2", "route_3", "route_4"];
                    const routeKey = routeKeys[groupIndex] || null;
                    const name = routeKey ? translate(routeKey) : `Route ${groupIndex + 1}`;
                    titleDiv = `
                        <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                            ${name}
                        </div>`;
                }
            }

            return `
                <div class="book-route__info">
                    ${titleDiv}
                    <div class="book-flex book-mb-4">
                        <div class="book-flex">
                            <div class="book-flight__details__progress__line book-ml-3 book-mr-3 book-relative">
                                <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-z-10">
                                    <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
                                </svg>
                                <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book--bottom-3 book-z-10">
                                    <use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use>
                                </svg>
                            </div>
                            <div class="book-flex book-flex-col book-border-l book-border-zinc-300 book-px-2 book-ml-3">
                                <div>
                                    <h5 class="book-text-xl book-font-bold book-text-zinc-900">${item.OriginAirport}</h5>
                                    <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${item.DepartureTime}</h5>
                                    <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.DepartureDate)}</p>
                                </div>
                                <div class="book-text-sm book-text-primary-400 book-my-10 book-w-40">
                                    <span class="book-ml-1">${await renderFormatterDuration(item.Duration)}</span>
                                    ${translate("flight_duration")}
                                </div>
                                <div>
                                    <h5 class="book-text-xl book-font-bold book-text-zinc-900">${item.DestinationAirport}</h5>
                                    <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${item.ArrivalTime}</h5>
                                    <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.ArrivalDate)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="book-flex">
                            <div class="book-flex book-flex-col">
                                <div>
                                    <h6 class="book-text-lg book-text-zinc-900">${await renderAirport(item.OriginAirport)}</h6>
                                    <p class="book-text-zinc-600 book-text-sm book-my-2">
                                        ${await renderCity(item.OriginAirport)}, ${await renderCountry(item.OriginAirport)}
                                    </p>
                                    <div class="book-flex book-items-center book-gap-2">
                                        <div class="">
                                            ${await renderAirlineLogo(item.AirlineCode, '5', '50', '20')}
                                        </div>
                                        <span class="book-text-zinc-900 book-text-sm">
                                            ${await renderAirlineName(item.AirlineCode)} ${item.FlightNumber}
                                        </span>
                                    </div>
                                    ${await renderOperatingAirlineCode(item)}
                                </div>
                                <div class="book-text-sm book-my-5">
                                    <div class="book-grid book-grid-cols-2 book-gap-2">
                                        ${renderAirlineInfo("class-details-icon", "ticket_class", `${await renderFlightClass(item.Class)}`)}
                                        ${renderAirlineInfo("wheel-bag-details-icon", "baggage_allowance", await renderBaggages(baggage))}
                                        ${renderAirlineInfo("ticket-details-icon", "fare_class", item.ClassCode)}
                                        ${renderAirlineInfo("plane-details-icon", "aircraft_type", item.AirCraft)}
                                    </div>
                                </div>
                                <div>
                                    <h6 class="book-text-lg book-text-zinc-900">${await renderAirport(item.DestinationAirport)}</h6>
                                    <p class="book-text-zinc-600 book-text-sm book-my-2">
                                        ${await renderCity(item.DestinationAirport)}, ${await renderCountry(item.DestinationAirport)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${await renderConnectionTimeRoute(item)}
                </div>`;
        };

        let output = "";
        for (let groupIndex = 0; groupIndex < (element.FlightGroup || []).length; groupIndex++) {
            const flightGroup = element.FlightGroup[groupIndex];
            const routeHtmls = await Promise.all(
                (flightGroup.RoutesInfo || []).map((item, i) =>
                    routeHtml(item, element.Baggages?.[i], i, true, groupIndex)
                )
            );
            output += routeHtmls.join('');
        }

        return output;
    } catch (error) {
        console.error("renderRoutesInfoPc: " + error.message);
        return "";
    }
};

/**
 * Renders connection time for a route stop in translated format.
 * @param {Object} element - Route data containing ConnectionTime and DestinationAirport.
 * @returns {Promise<string>} HTML string representing connection time or empty string if invalid.
 */
const renderConnectionTimeRoute = async (element) => {
    try {
        if (element?.ConnectionTime > 0) {
            const hours = Math.floor(element.ConnectionTime / 60);
            const minutes = element.ConnectionTime % 60;

            return `<div class="book-my-10 book-flex book-text-zinc-800 book-text-sm book-justify-between book-bg-zinc-100 book-rounded-xl book-p-3">
              <div class="book-flex book-gap-1">
                  <svg width="15" height="16">
                      <use href="/booking/images/sprite-booking-icons.svg#hourglass-icon"></use>
                  </svg>
                  <span>${translate("connection_time")}: ${hours} ${translate("hour")} ${translate("until_time")} ${minutes} ${translate("minute")}</span>
              </div>
              <div>
                  (${element.DestinationAirport})
                  ${await renderAirport(element.DestinationAirport)}
              </div>
          </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderConnectionTimeRoute: ${error.message}`);
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
        const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
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

        let result = `${hours} ${translate("hours")}`;
        if (minutes > 0) {
            result += ` ${minutes} ${translate("minutes")}`;
        }

        return result;
    } catch (error) {
        console.error("renderFormatterDuration: " + error.message);
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
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
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
        const mergedCarriers = dictionaries.reduce((acc, item) => ({ ...acc, ...item.carriers }), {});
        const carrier = mergedCarriers[element] || { image: "", name: "" };
        const imgTag = `<img class="book-route__airline book-mx-auto book-h-${heightClass}" src="/${carrier.image}" width="${width}" height="${height}" alt="${carrier.name}"/>`;

        if (item?.RoutesInfo?.length > 1) {
            const codes = item.RoutesInfo.map(route => route.AirlineCode);
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
                        <span class="book-mr-1">${element.OperatingAirlineCode}</span><span>(${await renderAirlineName(element.OperatingAirlineCode)})</span>
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
        const key = element.toLowerCase();
        const classKeys = {
            economy: "flight_class_economy",
            businessclass: "flight_class_business",
            firstclass: "flight_class_first"
        };

        const translationKey = classKeys[key] || "flight_class_first";
        return translate(translationKey);
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
        const mergedCarriers = dictionaries.reduce((acc, item) => ({ ...acc, ...item.carriers }), {});
        return `<img src="/${mergedCarriers[element].image}" width="70" height="28" alt="${mergedCarriers[element].name}"/>`;
    } catch (error) {
        console.error("renderAirlineCode: " + error.message);
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
        const mergedCarriers = dictionaries.reduce((acc, item) => ({ ...acc, ...item.carriers }), {});
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
        if (!element) return "";
        if (Number(element?.Baggage) === 0) {
            return `<span class="book-baggage__info ${style ? 'book-font-bold' : ''}">${translate("no_baggage_allowed")}</span>`;
        };
        const marginLeftClass = isRTL ? 'book-ml-1' : 'book-mr-1';
        const baggageHTML = `
    <span class="book-baggage__info ${style ? 'book-relative book-top-[2px] book-font-bold' : ''}">
        ${element.Baggage}
        <span class="${marginLeftClass}">${element.Unit || ""}</span>
    </span>`;
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
const renderConnectionTime = async (element) => {
    try {
        if (element > 0) {
            const hours = Math.floor(element / 60);
            const minutes = element % 60;
            const marginRightClass = isRTL ? 'book-mr-1' : 'book-ml-1';

            return `<div class="book-text-xs book-text-zinc-600 ${isMobile ? 'book-mb-2' : 'book-mt-2'} book-flex book-items-center">
              <svg width="15" height="15" class="${isMobile ? '' : 'book-mx-auto'}">
                  <use href="/booking/images/sprite-booking-icons.svg#time-circle-icon"></use>
              </svg>
              <span class="${marginRightClass} book-relative book-top-[2px]">${hours}:${minutes}</span>
          </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderConnectionTime: ${error.message}`);
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
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
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
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
        return mergedLocation[element].airport;
    } catch (error) {
        console.error("renderAirport: " + error.message);
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
        let output = "";
        const passengerMap = {
            Adult: "passenger_adult",
            Child: "passenger_child",
            Infant: "passenger_infant"
        };

        const items = element.PriceInfo.PassengerFare || [];
        const validCount = items.filter(item => item.Count > 0).length;
        let currentIndex = 0;

        for (const item of items) {
            if (item.Count > 0) {
                const passengerKey = passengerMap[item.passengerType] || null;
                const passengerType = passengerKey ? translate(passengerKey) : item.passengerType;
                currentIndex++;

                const ulClass = (currentIndex === validCount) ? '' : 'book-mb-6';

                output += `<ul class="${ulClass}">
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("base_fare")}</span>
                      <span>${new Intl.NumberFormat().format(item.BaseFare)}${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("taxes")}</span>
                      <span>${new Intl.NumberFormat().format(item.Tax)}${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("each_passenger")} ${passengerType}</span>
                      <span>${new Intl.NumberFormat().format(item.Unit)}${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("total_passenger")} ${passengerType}</span>
                      <span>${new Intl.NumberFormat().format(item.Total)}${await renderCurrency(element.PriceInfo.Currency)}</span>
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
        const mergedCurrency = dictionaries.reduce((acc, item) => ({ ...acc, ...item.currency }), {});
        if (type === "input") {
            return mergedCurrency[element]; // Return raw currency value
        }
        return `<span class="book-text-xs book-mr-1">${mergedCurrency[element]}</span>`; // Return HTML span with symbol
    } catch (error) {
        console.error("renderCurrency: " + error.message);
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
    } catch (error) {
        console.error("renderListApi: " + error.message);
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
        apiContainer.querySelector(".book-api__container__loader").classList.add("book-hidden");
        // Remove the rendering class to reset state
        apiContainer.classList.remove("book-rendering__info__api");
    } catch (error) {
        console.error("renderInfoApi: " + error.message);
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
        const accountType = document.querySelector(".book-buyers__container").dataset.accounttype;
        // Get first pay amount, removing commas
        const firstPay = document.querySelector(".book-firstpay__cost").textContent.replace(/,/g, "");
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
        const {
            requests,
            productGroupField,
            productIdField
        } = getServiceMappingInfo(selectedMode);
        const checkCouponUrl = requests.checkCoupon;
        // Trigger API call to check coupon
        $bc.setSource("cms.checkCoupon", [{
            SessionId: sessionSearchStorage.SessionId,
            Group: JSON.stringify(sessionBookStorage.FlightGroup),
            Id: sessionBookStorage.FlightId,
            selectedMode: selectedMode,
            accountType,
            price,
            firstPay,
            couponCode,
            rkey: rkey,
            url: checkCouponUrl,
            productIdField: productIdField,
            productGroupField: productGroupField,
            run: true
        }]);
    } catch (error) {
        console.error("renderCheckCoupon: " + error.message);
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
        const loader = counterContainer.querySelector(".book-drop__loader__content");
        if (loader) {
            loader.classList.add("book-hidden");
        }
    } catch (error) {
        console.error("renderCounter: " + error.message);
    }
};

/**
 * Renders company rules UI after data is processed.
 * Sets the data-run attribute on the input.
 */
const renderCompanyRule = async () => {
    try {
        // Set data-run attribute to indicate processing completion
        document.querySelector(".book-company__rule__container input").setAttribute("data-run", "1");
    } catch (error) {
        console.error("renderCompanyRule: " + error.message);
    }
};

/**
 * Renders the bank list by updating invoice content with the first pay cost and removing the loader.
 * @param {HTMLElement} element - The element triggering the rendering (not used in the function).
 */
const renderBankList = async (element) => {
    try {
        // Update all invoice content elements with the first pay cost
        document.querySelectorAll(".book-invoice__content").forEach(e => {
            const firstPayCost = e.querySelector(".book-firstpay__cost");
            if (firstPayCost) {
                // Set the first pay cost text to match the value in the first pay container
                firstPayCost.textContent = document.querySelector(".book-firstpay__container .book-firstpay__cost").textContent;
            }
            const unit = document.querySelector(".book-unit__content").querySelector("span");
            const unitDisplay = document.querySelector(".book-unit__display");
            if (unitDisplay) unitDisplay.textContent = unit.textContent;
        });

        // Remove the API loader if it exists
        const loader = document.querySelector(".book-invoice__container .book-api__container__loader");
        if (loader) {
            loader.remove();
        }
    } catch (error) {
        console.error("renderBankList: " + error.message);
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
        if (!sessionBookStorage || !sessionBookStorage.FlightGroup || !sessionBookStorage.PriceInfo) {
            throw new Error("Invalid or missing data in sessionBookStorage");
        }

        schemaId = sessionSearchStorage.SchemaId;

        // Update cabin class display
        const cabinClass = document.querySelector(".book-cabinClass__searched__content");
        if (!cabinClass) {
            throw new Error("Cabin class element not found");
        }

        const cabinMap = {
            Economy: { text: "اکونومی", class: "Economy" },
            BusinessClass: { text: "بیزینس", class: "BusinessClass" },
            FirstClass: { text: "فرست", class: "FirstClass" }
        };
        const flightClass = sessionBookStorage.FlightGroup[0].Class;
        const cabin = cabinMap[flightClass] || { text: "اکونومی", class: "Economy" }; // Fallback to Economy
        cabinClass.textContent = cabin.text;
        cabinClass.dataset.class = cabin.class;

        // Update flight type selection
        const flightTypes = document.querySelectorAll('.book-module__flight__type li');
        if (flightTypes.length < 3) {
            throw new Error("Flight type elements not found or insufficient");
        }
        flightTypes.forEach(item => item.classList.remove('book-active__module__flight__type'));
        const typeIndex = { 291: 0, 290: 1, 292: 2 }[schemaId];
        if (flightTypes[typeIndex]) {
            flightTypes[typeIndex].classList.add('book-active__module__flight__type');
        } else {
            console.warn(`Invalid schemaId: ${schemaId}, defaulting to first flight type`);
            flightTypes[0].classList.add('book-active__module__flight__type');
        }

        // Update passenger summary
        const passengerItems = document.querySelectorAll('.book-passenger__searched__items li');
        const passengerCountInput = document.querySelector('.book-passenger__count');
        if (passengerItems.length < 3 || !passengerCountInput) {
            throw new Error("Passenger items or count input not found");
        }

        const passengerFare = sessionBookStorage.PriceInfo.PassengerFare;
        const passengerParts = [];
        if (passengerFare[0].Count > 0) passengerParts.push(`${passengerFare[0].Count} ${translate("passenger_adult")}`);
        if (passengerFare[1].Count > 0) passengerParts.push(`${passengerFare[1].Count} ${translate("passenger_child")}`);
        if (passengerFare[2].Count > 0) passengerParts.push(`${passengerFare[2].Count} ${translate("passenger_infant")}`);
        const passengerSummary = passengerParts.join(' / ') || `1 ${translate("passenger_adult")}`;

        passengerCountInput.value = passengerSummary;

        passengerItems[0].querySelector(".book-passenger__count__value").innerHTML = passengerFare[0].Count || 0;
        passengerItems[1].querySelector(".book-passenger__count__value").innerHTML = passengerFare[1].Count || 0;
        passengerItems[2].querySelector(".book-passenger__count__value").innerHTML = passengerFare[2].Count || 0;

        // Update passenger UI for single adult case
        if (passengerFare[0].Count === 1 && passengerFare[1].Count === 0 && passengerFare[2].Count === 0) {
            updateBookPassengerUI(); // Assumed to be defined elsewhere
        }

        // Update trip details
        if (sessionBookStorage.FlightGroup.length === 0) {
            throw new Error("No flight group data available");
        }

        const departureLocationName = document.querySelector(".departure__location__name");
        const arrivalLocationName = document.querySelector(".arrival__location__name");
        const departureDate = document.querySelector(".departure__date");
        const arrivalDate = document.querySelector(".arrival__date");
        const arrivalDateContainer = document.querySelector(".arrival__date__container");
        if (!departureLocationName || !arrivalLocationName || !departureDate || !arrivalDate || !arrivalDateContainer) {
            throw new Error("Trip detail elements not found");
        }

        const flightGroup = sessionBookStorage.FlightGroup;
        const lastIndex = flightGroup.length - 1;

        if (schemaId === 291) {
            // One-way trip
            departureLocationName.value = await renderCity(flightGroup[0].Origin) || "";
            arrivalLocationName.value = await renderCity(flightGroup[0].Destination) || "";
            departureLocationName.dataset.id = flightGroup[0].Origin;
            arrivalLocationName.dataset.id = flightGroup[0].Destination;
            departureDate.value = convertToPersianDateRetry(flightGroup[0].DepartureDate) || "";
            departureDate.dataset.date = flightGroup[0].DepartureDate || "";
        } else if (schemaId === 290) {
            // Round-trip
            departureLocationName.value = await renderCity(flightGroup[0].Origin) || "";
            arrivalLocationName.value = await renderCity(flightGroup[lastIndex].Origin) || "";
            departureLocationName.dataset.id = flightGroup[0].Origin;
            arrivalLocationName.dataset.id = flightGroup[lastIndex].Origin;
            departureDate.value = convertToPersianDateRetry(flightGroup[0].DepartureDate) || "";
            departureDate.dataset.date = flightGroup[0].DepartureDate || "";
            arrivalDate.value = convertToPersianDateRetry(flightGroup[lastIndex].ArrivalDate) || "";
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
                tripNameDiv.textContent = `${translate("route")} ${tripNames[index] || (index + 1)}`;
                // Fallback to index
                tripElement.insertAdjacentElement("afterbegin", tripNameDiv);

                // Update trip details
                const depInput = tripElement.querySelector(".departure__location__name");
                const arrInput = tripElement.querySelector(".arrival__location__name");
                const depDate = tripElement.querySelector(".departure__date");
                const arrDateContainer = tripElement.querySelector(".arrival__date__container");
                if (!depInput || !arrInput || !depDate || !arrDateContainer) {
                    throw new Error("Trip element inputs not found");
                }

                depInput.value = await renderCity(trip.Origin) || "";
                arrInput.value = await renderCity(trip.Destination) || "";
                depInput.dataset.id = trip.Origin;
                arrInput.dataset.id = trip.Destination;
                depDate.value = convertToPersianDateRetry(trip.DepartureDate) || "";
                depDate.dataset.date = trip.DepartureDate || "";
                arrDateContainer.classList.add("book-hidden");

                // Add delete button for trips 3 and 4
                if (index === 2 || index === 3) {
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = translate("delete");
                    deleteButton.type = "button";
                    deleteButton.classList.add("route__delete", "book-bg-red-500", "book-text-sm", "book-text-white", "book-px-2", "book-py-1", "book-rounded", "book-left-5", "book-top-0", "book-absolute");
                    deleteButton.onclick = () => deleteRoute(deleteButton); // Assumed to be defined elsewhere
                    tripElement.appendChild(deleteButton);
                }

                container.appendChild(tripElement);
            }

            // Update container styling for multi-city trips
            container.classList.remove("book-w-3/5");
            container.classList.add("book-grid", "book-grid-cols-2", "book-gap-4");
            container.querySelectorAll(".book-min-w-48").forEach(e => e.classList.remove("book-min-w-48"));
            container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-11/12"));
            const addRouteContainer = document.querySelector(".book__add__roue__container");
            if (addRouteContainer) {
                addRouteContainer.classList.remove("book-hidden");
            }
        }
    } catch (error) {
        console.error("renderResearch: " + error.message);
    }
};
/**
* Converts a Gregorian date to a Persian (Shamsi) date string.
*/
const convertToPersianDateRetry = (element) => {
    try {
        const gregorianDate = new Date(element);
        const formatter = new Intl.DateTimeFormat('fa-IR', {
            calendar: 'persian',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        return formatter.format(gregorianDate);
    } catch (error) {
        console.error("convertToPersianDateRetry: " + error.message);
        return "";
    }
};
/**
* Updates the passenger UI with current counts and button states.
*/
const updateBookPassengerUI = () => {
    try {
        const items = document.querySelectorAll('.book-passenger__searched__items li');
        const totalInput = document.querySelector('.book-passenger__count');

        // Build passenger summary
        const passengerParts = [];
        if (adultsCountBook > 0) passengerParts.push(`${adultsCountBook} ${translate("passenger_adult")}`);
        if (childrenCountBook > 0) passengerParts.push(`${childrenCountBook} ${translate("passenger_child")}`);
        if (infantsCountBook > 0) passengerParts.push(`${infantsCountBook} ${translate("passenger_infant")}`);

        totalInput.value = passengerParts.join(' / ');

        // Update each passenger type UI
        items.forEach(li => {
            const type = li.dataset.type;
            const countSpan = li.querySelector('.book-passenger__count__value');
            const plusBtn = li.querySelector('.book-plus');
            const minusBtn = li.querySelector('.book-minus');

            let count, min = 0, max = MAX_PER_TYPEBook;
            if (type === 'adult') {
                count = adultsCountBook;
                min = 1;
                max = Math.min(MAX_PER_TYPEBook, MAX_TOTALBook - childrenCountBook - infantsCountBook);
            } else if (type === 'child') {
                count = childrenCountBook;
                max = Math.min(MAX_PER_TYPEBook, MAX_TOTALBook - adultsCountBook - infantsCountBook);
            } else if (type === 'infant') {
                count = infantsCountBook;
                max = Math.min(adultsCountBook, MAX_PER_TYPEBook);
            }

            countSpan.textContent = count;
            plusBtn.style.pointerEvents = count >= max ? 'none' : 'auto';
            plusBtn.style.opacity = count >= max ? '0.3' : '1';
            minusBtn.style.pointerEvents = count <= min ? 'none' : 'auto';
            minusBtn.style.opacity = count <= min ? '0.3' : '1';
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
        const allServices = servicesContent?.querySelectorAll(".book-route__service");
        const allRouteButtons = servicesContent?.querySelectorAll(".book-active__roue__excessService");

        // Hide all service sections
        allServices?.forEach(item => item.classList.add("book-hidden"));

        // Remove active class from all route headers and set arrow icon to "up"
        allRouteButtons?.forEach(btn => {
            btn.classList.remove("book-active__roue__excessService");
            const iconUse = btn.querySelector(".book-arrow__icon")?.querySelector("svg:last-of-type use");
            if (iconUse) {
                iconUse.setAttribute("href", "/booking/images/sprite-booking-icons.svg#up-arrow-icon");
            }
        });

        // Show the selected service section
        const currentItem = document.getElementById(serviceItemId);
        if (currentItem) {
            currentItem.classList.remove("book-hidden");

            // Add active class to the selected route header
            element.classList.add("book-active__roue__excessService");

            // Change arrow icon to "down"
            const iconUse = element.querySelector(".book-arrow__icon")?.querySelector("svg:last-of-type use");
            if (iconUse) {
                iconUse.setAttribute("href", "/booking/images/sprite-booking-icons.svg#down-arrow-icon");
            }
        } else {
            throw new Error(`Service item with ID ${serviceItemId} not found`);
        }
    } catch (error) {
        console.error("toggleServiceTable: " + error.message);
    }
};
/**
 * Toggles the arrow icon between up and down states.
 * @param {HTMLElement} element - The SVG element containing the icon.
 */
const toggleReserveArrowIcon = (element) => {
    try {
        if (!element) return;
        const href = element.getAttribute("href") || element.getAttribute("xlink:href") || "";
        const newIcon = href.includes("#down-arrow-icon") ? "up-arrow-icon" : "down-arrow-icon";
        element.setAttribute("href", `/booking/images/sprite-booking-icons.svg#${newIcon}`);
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
        const renderingContainer = document.querySelector(".book-api__container__rendering");
        if (renderingContainer) {
            renderingContainer.classList.remove('book-api__container__rendering');
        }

        // Determine content selector based on parent
        const contentSelector = parent === 'book-services__container' ? '.book-api__content' : '.book-api__container__content';
        const apiContainer = element.closest(`.${parent}`);
        const content = apiContainer.querySelector(contentSelector);
        const arrow = apiContainer.querySelector(".book-api__container__arrow use");

        // Toggle content visibility based on scroll or click
        if (fromScroll) {
            if (content.classList.contains('book-hidden')) {
                content.classList.remove('book-hidden');
            }
        } else {
            content.classList.toggle('book-hidden');
        }

        // Toggle arrow icon if it exists
        if (arrow) toggleReserveArrowIcon(arrow);

        // Handle special services container logic
        if (parent === 'book-services__container') {
            // Trigger baggageService tab on first run
            if (element.dataset.run === "0") {
                const baggageButton = apiContainer.querySelector('button[onclick*="baggageService"]');
                if (baggageButton) {
                    selectServiceTab(baggageButton, 'baggageService', 'ExcessService');
                }
                element.setAttribute("data-run", "1");
            }
        } else {
            // Fetch rules on first run if loader exists for other containers
            if (element.dataset.run === "0" && apiContainer.querySelector(".book-api__container__loader")) {
                content.classList.add('book-api__container__rendering');
                let cookieValue = `; ${document.cookie}`;
                let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
                let rkey = match ? match[1] : null;
                $bc.setSource("cms.rule", {
                    type,
                    SessionId: sessionSearchStorage.SessionId,
                    FlightId: sessionBookStorage.FlightId,
                    FlightGroup: JSON.stringify(sessionBookStorage.FlightGroup),
                    rkey: rkey,
                    run: true
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
        passengerContainer.querySelectorAll(`.book-internal__${add}`).forEach(e => {
            e.querySelectorAll(".book-check-required").forEach(ie => {
                ie.classList.add("book-Required");
            });
            e.classList.remove("book-hidden");
        });

        // Hide fields for the removed type and clear required status
        passengerContainer.querySelectorAll(`.book-internal__${remove}`).forEach(e => {
            e.querySelectorAll(".book-check-required").forEach(ie => {
                ie.classList.remove("book-Required");
            });
            e.classList.add("book-hidden");
        });

        // Check the selected radio input
        element.querySelector("input[type=radio]").checked = true;

        // Update date dropdown items for DateOfBirth field
        passengerContainer.querySelector(".book-DateOfBirth").closest(".book-date__item__container")
            .querySelectorAll(".book-drop__item__content").forEach(e => {
                e.querySelectorAll("li").forEach(ie => {
                    if (ie.getAttribute("data-switch")) {
                        const dataSwitch = ie.getAttribute("data-switch");
                        const dataValue = ie.getAttribute("data-value");
                        // Update text content with the new data-switch value
                        ie.textContent = dataSwitch;
                        // Update dataset id if year dropdown
                        if (ie.closest(".book-date__item__content").querySelector(".book-year")) {
                            ie.dataset.id = dataSwitch;
                        }
                        // Swap data-switch and data-value attributes
                        ie.setAttribute("data-switch", dataValue);
                        ie.setAttribute("data-value", dataSwitch);
                    }
                });
            });
    } catch (error) {
        console.error("togglePassengerType: " + error.message);
    }
};

/**
 * Toggles visibility of two elements by showing one and hiding the other.
 * @param {string} showClass - CSS class of the element to show.
 * @param {string} hideClass - CSS class of the element to hide.
 */
const toggleVisibility = (showClass, hideClass) => {
    try {
        // Show the specified element
        document.querySelector(showClass).classList.remove("book-hidden");
        // Hide the specified element
        document.querySelector(hideClass).classList.add("book-hidden");
    } catch (error) {
        console.error("toggleVisibility: " + error.message);
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
        document.querySelectorAll(".book-drop__item__content").forEach(e => {
            e.classList.remove("book-drop__item__content-toggle");
        });

        // Show all list items in the target dropdown
        const dropContainer = element.closest(`.${type}`);
        dropContainer.querySelector(".book-drop__item__content").querySelectorAll("li").forEach(e => {
            e.classList.remove("book-hidden");
        });

        // Toggle the target dropdown visibility
        dropContainer.querySelector(".book-drop__item__content").classList.toggle("book-drop__item__content-toggle");

        // Trigger data load if specified and not yet run
        if (load && !element.getAttribute("data-run")) {
            // Set positioning for loader based on container type
            let left = "book-left-12";
            let top = "book-top-7";
            if (element.closest(".book-code__item__container") || element.closest(".book-counter__container")) {
                left = "book-left-9";
                top = "book-top-2.5";
            }
            // Insert loader HTML
            element.insertAdjacentHTML("afterend",
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
                </span>`);
            // Trigger API call
            $bc.setSource(`cms.${load}`, true);
            // Add rendering class if in API container
            if (element.closest(".book-api__container")) {
                element.closest(".book-api__container").classList.add("book-rendering__list__api");
            }
        }
    } catch (error) {
        console.error("toggleDropItem: " + error.message);
    }
};
/**
 * Toggles company rules modal visibility and triggers data load if needed.
 * @param {HTMLElement} element - Element triggering the toggle (e.g., checkbox).
 */
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
        const selectItemContent = element.closest('.book-select__item__container').querySelector('.book-select__item__content');

        // Toggle visibility by adding or removing the hidden class
        if (selectItemContent.classList.contains("book-hidden")) {
            selectItemContent.classList.remove("book-hidden");
        } else {
            selectItemContent.classList.add("book-hidden");
        }
    } catch (error) {
        console.error("toggleSelectItem: " + error.message);
    }
}

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
            const loader = couponContainer.querySelector(".book-api__container__loader");
            if (loader) loader.classList.add("book-hidden");

            const responseElement = couponContainer.querySelector(".book-api__container__reponse");
            if (!responseElement) throw new Error("Response element not found");

            if (responseJson) {
                const code = Number(responseJson.code);
                if (code === 1) {
                    responseElement.textContent = translate("coupon_less_than_price");
                    updatePrices();
                } else if (code === 2) {
                    responseElement.textContent = translate("coupon_not_valid_for_product");
                    updatePrices();
                } else if (code === 3) {
                    responseElement.textContent = translate("coupon_not_found");
                    updatePrices();
                } else if (code === 4) {
                    responseElement.textContent = translate("coupon_already_used");
                    updatePrices();
                } else {
                    // Valid coupon
                    if (responseJson.coupon_price?.unit === 'percent') {
                        const discount = responseJson.coupon_price.cost;
                        const message = translate("coupon_percent_discount").replace("{value}", discount);
                        responseElement.innerHTML = `<span>${message}</span>`;
                        updatePrices(responseJson.buy_price?.cost, responseJson.buy_price?.firstpay);
                    } else {
                        // Future support: fixed amount coupons
                    }
                }
            }
        }
    } catch (error) {
        console.error("onProcessedCheckCoupon: " + error.message);
    }
};


/**
 * Processes Safarmarket flight API response, updates sessionStorage, and displays warning modal if needed.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedFlightSafarmarket = async (args) => {
    try {
        // Trigger research API call
        $bc.setSource("cms.session", true);

        const response = args.response;
        if (response.status !== 200) {
            throw new Error(`Unexpected response status: ${response.status}`);
        }

        const responseJson = await response.json();
        if (!responseJson) {
            throw new Error("Invalid response JSON or missing SessionId");
        }

        // Save flight data to sessionStorage
        sessionStorage.setItem("sessionBook", JSON.stringify(responseJson));

        // Update global variable
        sessionBookStorage = responseJson;

        // Initialize or update sessionSearch in sessionStorage
        sessionStorage.setItem("sessionSearch", JSON.stringify({}));
        sessionSearchStorage = sessionStorage.getItem("sessionSearch")
            ? JSON.parse(sessionStorage.getItem("sessionSearch"))
            : {};

        // Set schemaId based on FlightGroup length
        if (Array.isArray(responseJson.FlightGroup)) {
            const flightGroupCount = responseJson.FlightGroup.length;
            if (flightGroupCount === 1) {
                sessionSearchStorage.SchemaId = 291;
                sessionSearchStorage.Type = "flight";
            } else if (flightGroupCount === 2) {
                sessionSearchStorage.SchemaId = 290;
                sessionSearchStorage.Type = "flight";
            }
            // Initialize selectedMode 
            selectedMode = "flight";

            // Update sessionSearch in sessionStorage
            sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));
        }

        // Show modal if message exists
        if (responseJson.message && responseJson.message.description) {
            console.log('Warning message received:', responseJson.message.description);
            const modalHtml = `
                <div class="book-warning__message__modal__container book-modal__container book-fixed book-top-0 book-left-0 book-w-screen book-h-screen book-overflow-hidden book-z-50">
                    <div class="book-modal__content book-bg-white book-fixed book-inset-x-0 book-top-1.2 book-w-[560px] book-rounded-2xl book-mx-auto book-p-5 book-text-center">
                        <svg class="book-stroke-secondary-400 book-mx-auto book-w-44">
                            <use xlink:href="/booking/images/sprite-booking-icons.svg#warning-icon"></use>
                        </svg>
                        <div class="book-warning__message book-text-2xl book-font-bold book-mt-6">
                            ${responseJson.message.description}
                        </div>
                        <div class="book-flex book-justify-between book-mt-6">
                            <button onclick="warningConfirm(this)" type="button"
                                class="book-min-w-48 book-text-white book-bg-primary-400 book-border book-border-solid book-border-primary-400 book-rounded-lg book-p-3 hover:book-bg-white hover:book-text-primary-400">
                                حله
                            </button>
                            <button onclick="warningReject(this)" type="button"
                                class="book-min-w-48 book-text-primary-400 book-border book-border-solid book-border-primary-400 book-rounded-lg book-p-3 hover:book-bg-primary-400 hover:book-text-white">
                                کنکله
                            </button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML("beforeend", modalHtml);
        }
    } catch (error) {
        console.error("onProcessedFlightSafarmarket: " + error.message);
    }
};

/**
 * Processes flight group API response, updates sessionStorage, and displays a warning modal if needed.
 * @param {Object} args - API response object containing the response data.
 */
const onProcessedFlightAi = async (args) => {
    try {
        // Trigger research API call
        $bc.setSource("cms.research", true);

        const response = args.response;
        if (response.status !== 200) {
            throw new Error(`Unexpected response status: ${response.status}`);
        }

        const responseJson = await response.json();
        if (!responseJson || !responseJson.SessionId) {
            throw new Error("Invalid response JSON or missing SessionId");
        }

        // Update session ID in sessionStorage
        sessionSearchStorage.SessionId = responseJson.SessionId;
        sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));
        sessionStorage.setItem("sessionBook", JSON.stringify(responseJson));

        // Update sessionBookStorage
        sessionBookStorage = sessionStorage.getItem("sessionBook")
            ? JSON.parse(sessionStorage.getItem("sessionBook"))
            : "";
        if (!sessionBookStorage) {
            throw new Error("Failed to parse sessionSearch from sessionStorage");
        }

        // Set flight group (assumed to be defined elsewhere)
        setFlightGroup();

        // Display warning modal if message exists
        if (responseJson.message && responseJson.message.description) {
            console.log('Warning message received:', responseJson.message.description);
            const modalHtml = `
                <div class="book-warning__message__modal__container book-modal__container book-fixed book-top-0 book-left-0 book-w-screen book-h-screen book-overflow-hidden book-z-50">
                    <div class="book-modal__content book-bg-white book-fixed book-inset-x-0 book-top-1.2 book-w-[560px] book-rounded-2xl book-mx-auto book-p-5 book-text-center">
                        <svg class="book-stroke-secondary-400 book-mx-auto book-w-44">
                            <use xlink:href="/booking/images/sprite-booking-icons.svg#warning-icon"></use>
                        </svg>
                        <div class="book-warning__message book-text-2xl book-font-bold book-mt-6">
                            ${responseJson.message.description}
                        </div>
                        <div class="book-flex book-justify-between book-mt-6">
                            <button onclick="warningConfirm(this)" type="button"
                                class="book-min-w-48 book-text-white book-bg-primary-400 book-border book-border-solid book-border-primary-400 book-rounded-lg book-p-3 hover:book-bg-white hover:book-text-primary-400">
                                حله
                            </button>
                            <button onclick="warningReject(this)" type="button"
                                class="book-min-w-48 book-text-primary-400 book-border book-border-solid book-border-primary-400 book-rounded-lg book-p-3 hover:book-bg-primary-400 hover:book-text-white">
                                کنکله
                            </button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML("beforeend", modalHtml);
        }
    } catch (error) {
        console.error("onProcessedFlightAi: " + error.message);
    }
};

/**
 * Processes flight API rules for rendering flight rules, baggage, and services.
 * @param {Object} args - API response object containing the response data.
 */
const onProcessedFlightApiRule = async (args) => {
    try {
        // Validate response
        const { response } = args;
        if (!response || response.status !== 200) return;

        // Parse JSON response
        const responseJson = await response.json();
        if (!responseJson) return;

        // Get main rendering container
        const renderingContainer = document.querySelector(".book-api__container__rendering");
        if (!renderingContainer) return;

        // Helper function to create container if it doesn't exist
        const ensureContainer = (parent, className) => {
            let container = parent.querySelector(`.${className}`);
            if (!container) {
                container = document.createElement("div");
                container.className = className;
                parent.appendChild(container);
            }
            return container;
        };

        // Helper function to generate passenger table
        const generatePassengerTable = (tableId, type) => {
            let rows = '';
            let passengerIndex = 1;
            const ordinals = [
                translate("first"),
                translate("second"),
                translate("third"),
                translate("fourth"),
                translate("fifth"),
                translate("sixth"),
                translate("seventh"),
                translate("eighth"),
                translate("ninth")
            ];
            const typeCounters = { Adult: 0, Child: 0, Infant: 0 };
            const typeMap = {
                Adult: translate("passenger_adult"),
                Child: translate("passenger_child"),
                Infant: translate("passenger_infant")
            };

            const passengers = sessionBookStorage?.PriceInfo?.PassengerFare || [];
            const passengersData = document.querySelector('.book-passengers__content:not(.book-hidden)');
            const passengerContainers = passengersData?.querySelectorAll('.book-passenger__container') || [];

            passengers.forEach(p => {
                const count = Number(p.Count || 0);
                if (count <= 0) return;

                const passengerTypeFa = typeMap[p.passengerType] || p.passengerType;
                for (let i = 0; i < count; i++) {
                    const ordinalIndex = typeCounters[p.passengerType]++;
                    const ordinalText = ordinals[ordinalIndex] || `${translate("number")} ${ordinalIndex + 1}`;
                    let fullTitle = `${passengerTypeFa} ${ordinalText}`;

                    const container = passengerContainers[passengerIndex - 1];
                    if (container) {
                        const firstName = container.querySelector('.book-FirstName')?.value?.trim();
                        const lastName = container.querySelector('.book-LastName')?.value?.trim();
                        if (firstName && lastName) fullTitle = `${firstName} ${lastName}`;
                    }
                    rows += `
                        <tr class="book-border book-passenger__row" data-index="${passengerIndex}">
                            <td class="book-p-2">
                                <span class="warning-icon book-h-5 book-leading-6 book-w-5 book-inline-block book-mr-2 book-rounded-full">
                                    <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <use href="/booking/images/sprite-booking-icons.svg#check-icon"></use>
                                    </svg>
                                </span>
                                ${fullTitle}
                            </td>
                            <td class="book-p-2">${translate("not_selected")}</td>
                            <td class="book-p-2">---</td>
                        </tr>`;
                    passengerIndex++;
                }
            });

            return `
                <table class="book-passenger__table book-text-center book-w-full book-text-sm book-border-collapse book-mt-2" id="${tableId}">
                    <thead>
                        <tr>
                            <th class="book-bg-zinc-100 book-border book-p-2 book-rounded-xl">${translate("passenger")}</th>
                            <th class="book-bg-zinc-100 book-border book-p-2 book-rounded-xl">${type === 'baggage' ? 'بار' : type === 'meal' ? 'غذا' : type === 'seat' ? 'صندلی' : ''}</th>
                            <th class="book-bg-zinc-100 book-border book-p-2 book-rounded-xl">${translate("price")}</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
        };

        // Helper function to generate service card
        const generateServiceCard = async (service, tableId, extraParam = '') => {
            const currency = await renderCurrency(service.Currency);
            return `
                <div class="book-service__card book-p-2 book-border book-mb-2 book-border-zinc-200 book-rounded-md book-text-center book-cursor-pointer book-bg-zinc-50 book-flex book-flex-col book-justify-center hover:book-border-primary-400"
                    data-id="${service.ServiceId}" onclick="updatePassengerServices(this,'${tableId}', '${service.Description}', ${service.Price}, '${service.Currency}', '${extraParam}')">
                    <div class="book-mb-2 book-font-arial book-ltr book-text-xs">${service.Description}</div>
                    <div class="book-text-zinc-500">${new Intl.NumberFormat().format(service.Price)} ${currency}</div>
                </div>`;
        };

        // Helper function to generate route section
        const generateRouteSection = (index, fromCity, toCity, fromCode, toCode, tableId, serviceCards, type) => {
            const gridClasses = (type !== 'seat' && !isMobile)
                ? 'book-grid book-grid-cols-3 book-gap-4'
                : '';
            return `
                <div class="book-mb-5 book-excessService__content">
                    <div
                        class="book-flex book-justify-between book-items-center book-mb-2 book-text-sm book-font-bold book-cursor-pointer${index === 1 ? ` book-active__roue__excessService` : ''}"
                        onclick="toggleServiceTable(this,'book-route__service-${type}-${index}')">
                        <div>
                            <span>${fromCity}<span class="book-mr-1">(${fromCode})</span></span>
                            <svg width="24" height="24" class="book-mx-1">
                                <use href="/booking/images/sprite-booking-icons.svg#left-arrow-icon"></use>
                            </svg>
                            <span>${toCity}<span class="book-mr-1">(${toCode})</span></span>
                        </div>
                        <div class="book-arrow__icon">
                            <svg width="24" height="24">
                                <use href="/booking/images/sprite-booking-icons.svg#${index === 1 ? 'down-arrow-icon' : 'up-arrow-icon'}"></use>
                            </svg>
                        </div>
                    </div>
                    <div id="book-route__service-${type}-${index}" class="book-route__service ${isMobile ? '' : 'book-flex book-gap-8'} ${index === 1 ? '' : 'book-hidden'}">
                        <div class="${isMobile ? 'book-w-full book-mb-4' : 'book-w-2/5'}">
                            ${generatePassengerTable(tableId, type)}
                        </div>
                        <div class="${isMobile ? 'book-w-full book-mb-4' : 'book-w-3/5'} book-max-h-80 book-overflow-auto ${gridClasses}">
                            ${serviceCards.join('')}
                        </div>
                    </div>
                </div>`;
        };

        const noRules = translate("no_rules_available");
        const noServices = translate("no_services_available");
        const noMeals = translate("no_meals_available");
        const noMealForRoute = translate("no_meal_for_this_route");
        const noSeats = translate("no_seats_available");

        // Render flight rules if available
        if (responseJson.FlightRules) {
            if (responseJson.FlightRules.length > 0) {
                let output = "";
                for (const item of responseJson.FlightRules) {
                    if (item.Rule?.length > 0) {
                        output += `
                            <div class="book-text-zinc-900 book-text-sm book-text-justify book-ltr">
                                <div class="book-mb-2 book-flex book-gap-1">
                                    <span>${item.From}</span>
                                    <svg width="24" height="24">
                                        <use href="/booking/images/sprite-booking-icons.svg#right-arrow-icon"></use>
                                    </svg>
                                    <span>${item.To}</span>
                                </div>
                                <div>${await renderRule(item.Rule)}</div>
                            </div>`;
                    } else {
                        renderingContainer.innerHTML = noRules;
                    }
                }
                renderingContainer.innerHTML = output || noRules;
            } else {
                renderingContainer.innerHTML = noRules;
            }
        }
        // Render baggage details
        else if (responseJson.Baggages) {
            if (responseJson.Baggages.length > 0) {
                let output = `
                    <table class="book-w-full book-table-auto book-border-separate [border-spacing:0_8px]">
                        <thead>
                            <tr>
                                <th class="book-pt-2 book-pb-4 book-pr-2 book-text-center book-text-primary-400">مبدا</th>
                                <th class="book-pt-2 book-pb-4 book-text-center book-text-primary-400">مقصد</th>
                                <th class="book-pt-2 book-pb-4 book-pl-2 book-text-center book-text-primary-400">بار</th>
                            </tr>
                        </thead>
                        <tbody>`;
                for (const item of responseJson.Baggages) {
                    output += `
                        <tr>
                            <td class="book-py-2 book-bg-zinc-100 book-rounded-s-lg book-pr-2 book-text-center">${item.Origin}</td>
                            <td class="book-py-2 book-bg-zinc-100 book-text-center">${item.Destination}</td>
                            <td class="book-py-2 book-bg-zinc-100 book-rounded-e-lg book-pl-2 book-text-center book-ltr book-font-arial">${item.Baggage} ${item.Unit}</td>
                        </tr>`;
                }
                output += `</tbody></table>`;
                renderingContainer.innerHTML = output;
            } else {
                renderingContainer.innerHTML = noRules;
            }
        }
        // Render flight services (baggage, meals)
        else if (responseJson.FlightServices) {
            // Remove loader and create service containers
            renderingContainer.querySelector(".book-api__container__loader")?.remove();
            const renderingServiceContainer = ensureContainer(renderingContainer, "book-api__container__rendering__baggageService");
            const renderingMealContainer = ensureContainer(renderingContainer, "book-api__container__rendering__mealService");
            renderingServiceContainer.classList.add("book-services__content");
            renderingMealContainer.classList.add("book-services__content");
            renderingMealContainer.classList.add("book-hidden");

            // Excess Baggage
            let baggageOutput = `<div>`;
            let hasAnyBaggageService = false;

            for (const [index, item] of responseJson.FlightServices.entries()) {
                const baggageServices = item.Services?.filter(s => s.ServiceType === "Excess Baggage") || [];
                if (baggageServices.length === 0) continue;

                hasAnyBaggageService = true;
                const fromCity = await renderCity(item.From);
                const toCity = await renderCity(item.To);

                const baggageServiceCards = await Promise.all(
                    baggageServices.map(service => generateServiceCard(service, `book-passenger__baggage__table-${index}`, ''))
                );

                baggageOutput += generateRouteSection(
                    index + 1,
                    fromCity,
                    toCity,
                    item.From,
                    item.To,
                    `book-passenger__baggage__table-${index}`,
                    baggageServiceCards,
                    'baggage'
                );
            }

            baggageOutput += `</div>`;
            renderingServiceContainer.innerHTML = hasAnyBaggageService ? baggageOutput : noServices;

            // Meal Services
            let mealOutput = `<div>`;
            let hasAnyMealService = false;
            const routesInfo = sessionBookStorage?.FlightGroup?.flatMap(group => group.RoutesInfo) || [];
            const routeIds = [1, 2, 3, 4];

            for (const routeId of routeIds) {
                const routeInfo = routesInfo.find(route => route.SegmentId === routeId);
                if (!routeInfo) continue;

                const fromCity = await renderCity(routeInfo.OriginAirport);
                const toCity = await renderCity(routeInfo.DestinationAirport);
                const fromAirport = routeInfo.OriginAirport;
                const toAirport = routeInfo.DestinationAirport;

                const mealServices = responseJson.FlightServices.flatMap(item =>
                    item.Services.filter(s => s.ServiceType === "Meal" && s.routeID === routeId)
                );

                if (mealServices.length > 0) {
                    hasAnyMealService = true;
                    const mealServiceCards = await Promise.all(
                        mealServices.map(service => generateServiceCard(service, `book-passenger__meal__table-${routeId}`))
                    );

                    mealOutput += generateRouteSection(
                        routeId,
                        fromCity,
                        toCity,
                        fromAirport,
                        toAirport,
                        `book-passenger__meal__table-${routeId}`,
                        mealServiceCards,
                        'meal'
                    );
                } else {
                    mealOutput += `
                        <div class="book-mb-5 book-excessService__content">
                            <div
                                class="book-flex book-justify-between book-items-center book-mb-2 book-text-sm book-font-bold book-cursor-pointer${routeId === 1 ? ' book-active__roue__excessService' : ''}"
                                onclick="toggleServiceTable(this,'book-route__service-meal-${routeId}')">
                                <div>
                                    <span>${fromCity}<span class="book-mr-1">(${fromAirport})</span></span>
                                    <svg width="24" height="24" class="book-mx-1">
                                        <use href="/booking/images/sprite-booking-icons.svg#left-arrow-icon"></use>
                                    </svg>
                                    <span>${toCity}<span class="book-mr-1">(${toAirport})</span></span>
                                </div>
                                <div class="book-arrow__icon">
                                    <svg width="24" height="24">
                                        <use href="/booking/images/sprite-booking-icons.svg#${routeId === 1 ? 'down-arrow-icon' : 'up-arrow-icon'}"></use>
                                    </svg>
                                </div>
                            </div>
                            <div id="book-route__service-meal-${routeId}" class="book-route__service book-flex book-gap-8 ${routeId === 1 ? '' : 'book-hidden'}">
                                <div class="book-w-full book-text-center">${noMealForRoute}</div>
                            </div>
                        </div>`;
                }
            }

            mealOutput += `</div>`;
            renderingMealContainer.innerHTML = hasAnyMealService ? mealOutput : noMeals;
        }
        // Render seat services
        else if (responseJson[0]?.FlightSegmentRefID) {
            renderingContainer.querySelector(".book-api__container__loader")?.remove();
            const renderingServiceContainer = ensureContainer(renderingContainer, "book-api__container__rendering__seatService");
            renderingServiceContainer.classList.add("book-services__content");

            let seatOutput = `<div>`;
            let hasAnySeatService = false;

            const generateSeatSVG = async (seatLabel, isAvailable, seatId, priceRaw, currency, characteristicText, tableId) => {
                const currencyText = await renderCurrency(currency);
                const priceText = new Intl.NumberFormat().format(priceRaw) + " " + currencyText;

                const defaultFill = isAvailable ? "#3b82f6" : "#d1d5db";
                const hoverFill = isAvailable ? "#10b981" : "#d1d5db";

                return `
                    <div class="book-relative book-group" style="width: 40px; height: 40px;">
                        <svg width="50" height="50" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"
                            style="cursor: ${isAvailable ? 'pointer' : 'not-allowed'};" data-id="${seatId}"
                            ${isAvailable ? `onclick="updatePassengerServices(this,'${tableId}', '${seatLabel}', ${priceRaw}, '${currency}')"` : ""}
                            onmouseenter="this.querySelectorAll('.book-seat__part').forEach(el => el.setAttribute('fill', '${hoverFill}'))"
                            onmouseleave="this.querySelectorAll('.book-seat__part').forEach(el => {
                                if (!this.classList.contains('book-seat__selected')) {
                                    el.setAttribute('fill', '${defaultFill}');
                                }
                            })"
                        >
                            <rect class="book-seat__part" x="10" y="2" width="16" height="14" rx="3" fill="${defaultFill}" stroke="#374151" stroke-width="1.2"/>
                            <path class="book-seat__part" d="M10 16 L26 16 L24 22 L12 22 Z" fill="${defaultFill}" stroke="#374151" stroke-width="1.2"/>
                            <line x1="8" y1="16" x2="10" y2="22" stroke="#374151" stroke-width="1.2"/>
                            <line x1="28" y1="16" x2="26" y2="22" stroke="#374151" stroke-width="1.2"/>
                            <text x="18" y="12" text-anchor="middle" fill="white" font-size="8" font-family="Arial" font-weight="bold">${seatLabel}</text>
                        </svg>
                        ${isAvailable ? `
                            <div class="book-absolute book-z-10 book-hidden book-group-hover:book-block book-w-44 book-top-full book-left-1/2 book--translate-x-1/2 book-bg-white book-shadow-md book-rounded book-text-xs book-p-2">
                                ${characteristicText ? `<div class="book-font-bold book-mb-2 book-pb-2 book-border-b-1 book-border-solid book-text-center book-font-arial">${characteristicText}</div>` : ""}
                                <div class="book-flex book-justify-between book-items-center">
                                    <div class="book-font-arial">${seatLabel}</div> 
                                    <div><span class="book-ml-1">${translate("price")}:</span>${priceText}</div>
                                </div>
                            </div>
                        ` : ""}
                    </div>`;
            };

            for (const [index, item] of responseJson.entries()) {
                hasAnySeatService = true;

                const fromCity = await renderCity(item.Route.Departure.AirportCode);
                const toCity = await renderCity(item.Route.Arrival.AirportCode);

                const seatMap = {};
                for (const seat of item.Seats || []) {
                    const cabinType = seat.Cabin?.CabinTypeName || "OTHER";
                    if (!seatMap[cabinType]) seatMap[cabinType] = [];
                    seatMap[cabinType].push(seat);
                }

                const seatServiceCards = [];

                for (const [cabin, seats] of Object.entries(seatMap)) {
                    seats.sort((a, b) => {
                        const rowA = parseInt(a.Row, 10);
                        const rowB = parseInt(b.Row, 10);
                        if (rowA !== rowB) return rowA - rowB;

                        const colA = a.Column.toLowerCase();
                        const colB = b.Column.toLowerCase();
                        if (colA < colB) return -1;
                        if (colA > colB) return 1;
                        return 0;
                    });

                    const layoutType = item.Aircraft?.LayoutType || "3-3";
                    const [leftSeats, rightSeats] = layoutType.split("-").map(Number);
                    const totalSeatsPerRow = leftSeats + rightSeats;

                    const seatsByRow = {};
                    for (const seat of seats) {
                        const row = seat.Row;
                        if (!seatsByRow[row]) seatsByRow[row] = [];
                        seatsByRow[row].push(seat);
                    }

                    seatServiceCards.push(`<div><div class="book-font-bold book-mb-2">${cabin}</div>`);
                    for (const [row, rowSeats] of Object.entries(seatsByRow)) {
                        rowSeats.sort((a, b) => {
                            const colA = a.Column.toLowerCase();
                            const colB = b.Column.toLowerCase();
                            if (colA < colB) return -1;
                            if (colA > colB) return 1;
                            return 0;
                        });

                        const leftGroup = rowSeats.filter(seat => ["A", "B", "C"].includes(seat.Column.toUpperCase()));
                        const rightGroup = rowSeats.filter(seat => ["D", "E", "F"].includes(seat.Column.toUpperCase()));

                        const leftSeatSVGs = await Promise.all(leftGroup.map(seat => {
                            const seatId = seat.Seat_Id;
                            const seatLabel = seat.SeatID;
                            const isAvailable = seat.Available === "true";
                            const priceRaw = seat.Price?.Total || 0;
                            const currency = seat.Price?.Currency || "IRR";
                            const characteristic = seat.SeatCharacteristicCode?.[0] || '';
                            const characteristicMap = {
                                WN: "Window",
                                AS: "Aisle",
                                "Middle": "Middle",
                                EX: "ExitRow",
                                PR: "Premium",
                                PR2: "Premium",
                                FR: "FrontRow"
                            };
                            const characteristicText = characteristicMap[characteristic] || '';
                            return generateSeatSVG(seatLabel, isAvailable, seatId, priceRaw, currency, characteristicText, `book-passenger__seat__table-${index}`);
                        }));

                        const rightSeatSVGs = await Promise.all(rightGroup.map(seat => {
                            const seatId = seat.Seat_Id;
                            const seatLabel = seat.SeatID;
                            const isAvailable = seat.Available === "true";
                            const priceRaw = seat.Price?.Total || 0;
                            const currency = seat.Price?.Currency || "IRR";
                            const characteristic = seat.SeatCharacteristicCode?.[0] || '';
                            const characteristicMap = {
                                WN: "Window",
                                AS: "Aisle",
                                "Middle": "Middle",
                                EX: "ExitRow",
                                PR: "Premium",
                                PR2: "Premium",
                                FR: "FrontRow"
                            };
                            const characteristicText = characteristicMap[characteristic] || '';
                            return generateSeatSVG(seatLabel, isAvailable, seatId, priceRaw, currency, characteristicText, `book-passenger__seat__table-${index}`);
                        }));

                        seatServiceCards.push(`
                            <div class="book-flex book-items-center book-mb-2">
                                <div class="book-flex book-gap-2" style="width: ${leftSeats * 48}px;">
                                    ${leftSeatSVGs.join('')}
                                </div>
                                <div class="book-aisle book-bg-zinc-100 book-h-10 book-w-8 book-flex book-items-center book-justify-center book-text-sm book-font-bold book-bg-zinc-200">
                                    ${row}
                                </div>
                                <div class="book-flex book-gap-2" style="width: ${rightSeats * 48}px;">
                                    ${rightSeatSVGs.join('')}
                                </div>
                            </div>`);
                    }
                    seatServiceCards.push(`</div>`);
                }

                seatOutput += generateRouteSection(
                    index + 1,
                    fromCity,
                    toCity,
                    item.Route.Departure.AirportCode,
                    item.Route.Arrival.AirportCode,
                    `book-passenger__seat__table-${index}`,
                    seatServiceCards,
                    'seat'
                );
            }

            seatOutput += `</div>`;
            renderingServiceContainer.innerHTML = hasAnySeatService ? seatOutput : noSeats;
        }
    } catch (error) {
        console.error("onProcessedFlightApiRule: " + error.message);
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
                sessionStorage.removeItem("sessionSearch");
                sessionStorage.removeItem("sessionBook");
                sessionStorage.removeItem("sessionAmenities");
                // Show message box and hide main container
                if (messageBox) messageBox.classList.remove("book-hidden");
                if (mainContainer) mainContainer.classList.add("book-hidden");
            }
        } else {
            // Handle non-200 response by clearing flight book and showing expiry message
            sessionStorage.removeItem("sessionBook");
            document.querySelector(".book-expire__message__modal__container")?.classList.remove("book-hidden");
            document.querySelector(".book-no__time")?.classList.remove("book-hidden");
        }
    } catch (error) {
        console.error("onProcessedSupplierCredit: " + error.message);
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
                const previousPassengersContainer = document.querySelector(".book-previous__passengers__container");
                // Show previous passengers container if hidden
                if (previousPassengersContainer?.classList.contains("book-hidden")) {
                    previousPassengersContainer.classList.remove("book-hidden");
                }
                // Hide the next sibling of the previous passenger container
                document.querySelector(".book-selected__passenger .book-previous__passenger__container")
                    ?.nextElementSibling?.classList.add("book-hidden");
                // Trigger grid rendering with response data
                $bc.setSource("cms.gridPreviousPassengers", responseJson);
            }
        }
    } catch (error) {
        console.error("onProcessedPreviousPassengers: " + error.message);
    }
};

/**
 * Processes user credit response and renders credit payment option if sufficient credit exists.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedUserCredit = async (args) => {
    try {
        const response = args.response;
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
                document.querySelectorAll(".book-passenger__container")?.forEach(e => {
                    e.querySelectorAll(".book-NameOfCountry").forEach(ie => {
                        // Set data-run attribute to indicate processing completion
                        ie.setAttribute("data-run", "1");
                        // Insert country list HTML into dropdown content
                        const dropContent = ie.closest(".book-info__item__container")?.querySelector(".book-drop__item__content");
                        if (dropContent) {
                            dropContent.innerHTML = output;
                            // Hide loader if present
                            const loader = ie.closest(".book-info__item__container")?.querySelector(".book-drop__loader__content");
                            if (loader) {
                                loader.classList.add("book-hidden");
                            }
                        }
                    });
                });
            }
        }
    } catch (error) {
        console.error("onProcessedJsonCountryId: " + error.message);
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
                document.querySelectorAll(".book-buyer__info__content")?.forEach(e => {
                    e.querySelectorAll(".book-code").forEach(ie => {
                        // Set data-run attribute to indicate processing completion
                        ie.setAttribute("data-run", "1");
                        // Insert country code list HTML into dropdown content if it exists
                        const dropContent = ie.closest(".book-info__item__container")?.querySelector(".book-drop__item__content");
                        if (dropContent) {
                            dropContent.innerHTML = output;
                            // Hide loader if present
                            const loader = ie.closest(".book-info__item__container")?.querySelector(".book-drop__loader__content");
                            if (loader) {
                                loader.classList.add("book-hidden");
                            }
                        }
                    });
                });
            }
        }
    } catch (error) {
        console.error("onProcessedJsonCountryCode: " + error.message);
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
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        if (totalTime === 360) {
            document.querySelector(".book-expire__message__modal__container")
                .classList.remove("book-hidden");
            document.querySelector(".book-some__time")
                .classList.remove("book-hidden");
        }

        if (totalTime > 0) {
            totalTime--;
            setTimeout(startTimer, 1000);
        } else {
            sessionStorage.removeItem("sessionBook");
            document.querySelector(".book-expire__message__modal__container")
                .classList.remove("book-hidden");
            document.querySelector(".book-no__time")
                .classList.remove("book-hidden");
            document.querySelector(".book-some__time")
                .classList.add("book-hidden");
        }
    } catch (error) {
        console.error("startTimer: " + error.message);
    }
};

/**
 * Sets up flight group data and initializes booking UI.
 * Loads booking data, passenger counts, and extra services UI.
 */
const setFlightGroup = async () => {
    try {
        if (sessionStorage.getItem("sessionBook")) {
            const dict = sessionBookStorage.dictionaries;
            if (Array.isArray(dict)) {
                dictionaries = dict;
            } else if (typeof dict === "object" && dict !== null) {
                dictionaries = [dict];
            }
        }

        $bc.setSource("flight.book", sessionBookStorage);
        sessionSearchStorage = sessionStorage.getItem("sessionSearch")
            ? JSON.parse(sessionStorage.getItem("sessionSearch"))
            : null;

        const Adults = sessionBookStorage.PriceInfo.PassengerFare[0].Count;
        const Children = sessionBookStorage.PriceInfo.PassengerFare[1].Count;
        const Infants = sessionBookStorage.PriceInfo.PassengerFare[2].Count;
        ExcessService = sessionBookStorage.FlightGroup?.[0]?.ExcessService || false;
        SeatSelection = sessionBookStorage.FlightGroup?.[0]?.SeatSelection || false;

        if (ExcessService || SeatSelection) {
            const container = document.querySelector(".book-passengers__container");
            if (!container) throw new Error("Passengers container not found");
            const div = document.createElement("div");
            div.innerHTML = `
                <div class="book-services__container book-api__container book-bg-white book-shadow-md book-border-slate-600 book-rounded-2xl book-border-b-3 book-p-5 book-mb-10">
                    <div class="book-text-base book-flex book-justify-between book-items-center book-cursor-pointer" onclick="toggleContentApi(this,'','book-services__container')" data-run="0">
                        <div>
                            ${translate("optional_services_title")}
                            <div class="book-text-zinc-500 book-text-xs book-mt-2 book-mb-5">
                                ${translate("optional_services_description")}
                            </div>
                        </div>
                        <svg class="book-api__container__arrow" width="24" height="24">
                            <use href="/booking/images/sprite-booking-icons.svg#down-arrow-icon"></use>
                        </svg>
                    </div>
                    <div class="book-api__content">
                        <div class="book-tab__navigation__container ${isMobile ? '' : 'book-flex book-justify-around book-space-x-2 book-space-x-reverse'} book-mb-10">
                            <button onclick="selectServiceTab(this,'baggageService','ExcessService')" data-run="0" type="button" class="book-tab__navigation__content ${isMobile ? 'book-w-full book-mb-4' : 'book-min-w-52'} book-p-4 book-rounded-xl book-border-zinc-400 book-border book-transition-colors book-text-zinc-500 hover:book-bg-primary-400 hover:book-border-primary-400 hover:book-text-white">
                                <svg width="51" height="50"><use href="/booking/images/sprite-booking-icons.svg#wheel-bag-icon"></use></svg>
                                <h6 class="book-text-sm">${translate("extra_baggage")}</h6>
                            </button>
                            <button onclick="selectServiceTab(this,'mealService','ExcessService')" data-run="0" type="button" class="book-tab__navigation__content ${isMobile ? 'book-w-full book-mb-4' : 'book-min-w-52'} book-p-4 book-rounded-xl book-border-zinc-400 book-border book-transition-colors book-text-zinc-500 hover:book-bg-primary-400 hover:book-border-primary-400 hover:book-text-white">
                                <svg width="41" height="50"><use href="/booking/images/sprite-booking-icons.svg#meal-icon"></use></svg>
                                <h6 class="book-text-sm">${translate("meal")}</h6>
                            </button>
                            <button onclick="selectServiceTab(this,'seatService','SeatAvailability')" data-run="0" type="button" class="book-tab__navigation__content ${isMobile ? 'book-w-full book-mb-4' : 'book-min-w-52'} book-p-4 book-rounded-xl book-border-zinc-400 book-border book-transition-colors book-text-zinc-500 hover:book-bg-primary-400 hover:book-border-primary-400 hover:book-text-white">
                                <svg width="41" height="50"><use href="/booking/images/sprite-booking-icons.svg#seat-icon"></use></svg>
                                <h6 class="book-text-sm">${translate("seat_selection")}</h6>
                            </button>
                        </div>
                        <div class="book-api__container__content book-mt-4 book-hidden">
                            <span class="book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-my-3"></span>
                        </div>
                    </div>
                </div>`;
            container.appendChild(div);
        }

        const internal = dictionaries[0]?.internal || false;

        if (internal) {
            const internalContainer = document.querySelector(".book-passengers__container__internal");
            if (!internalContainer) throw new Error("Internal passengers container not found");
            internalContainer.classList.remove("book-hidden");
            addPassenger(".book-passengers__container__internal", Adults, Children, Infants);
        } else {
            const externalContainer = document.querySelector(".book-passengers__container__external");
            if (!externalContainer) throw new Error("External passengers container not found");
            externalContainer.classList.remove("book-hidden");
            addPassenger(".book-passengers__container__external", Adults, Children, Infants);
        }

        startTimer();
        getWithExpiry("sessionSearch", "sessionBook", "sessionAmenities");

        let cookieValue = `; ${document.cookie}`;
        let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
        let rkey = match ? match[1] : null;
        const {
            requests,
            productGroupField,
            productIdField
        } = getServiceMappingInfo(selectedMode);
        const supplierCreditUrl = requests.supplierCredit;

        $bc.setSource("cms.supplierCredit", [{
            SessionId: sessionSearchStorage?.SessionId,
            Id: sessionBookStorage.FlightId,
            Group: JSON.stringify(sessionBookStorage.FlightGroup),
            selectedMode: selectedMode,
            rkey: rkey,
            url: supplierCreditUrl,
            productIdField: productIdField,
            productGroupField: productGroupField,
            run: true
        }]);

        originalFirstPay = sessionBookStorage.PriceInfo.TotalCommission;
        originalTotalCom = sessionBookStorage.PriceInfo.TotalCommission;
        originalTotal = sessionBookStorage.PriceInfo.Total;

        if (sessionStorage.getItem("sessionAmenities")) {
            sessionAmenitiesStorage = JSON.parse(sessionStorage.getItem("sessionAmenities"));
            if (sessionAmenitiesStorage?.FlightGroup?.length > 0) {
                const fareFamilyHtml = document.createElement("div");
                fareFamilyHtml.className = "book-flight__fareFamily book-api__container book-p-4 book-border book-border-zinc-300 book-rounded-2xl book-mb-4";

                fareFamilyHtml.innerHTML = `
                  <div class="book-border-b book-border-zinc-300 book-pb-8 book-mb-7">
                      <div class="book-flex book-justify-between book-items-center book-mb-2">
                          <h6 class="book-text-lg book-font-bold book-text-zinc-800">${translate("fare_family")}</h6>
                          <svg class="book-api__container__arrow" width="24" height="24">
                              <use href="/booking/images/sprite-booking-icons.svg#down-arrow-icon"></use>
                          </svg>
                      </div>
                  </div>
                  <div class="book-api__container__content">
                      <div class="book-grid book-grid-cols-1 book-gap-4 book-ltr"></div>
                  </div>
                `;

                const gridContainer = fareFamilyHtml.querySelector(".book-grid");

                for (const group of sessionAmenitiesStorage.FlightGroup) {
                    const card = document.createElement("div");
                    card.className = "book-border book-rounded-2xl book-border-zinc-200 book-cursor-pointer book-active__amenities";
                    card.innerHTML = `
                    <div class="book-p-3">
                        <h6 class="book-font-bold book-mb-2 book-text-zinc-900">${group.BrandedFare}</h6>
                        <p class="book-mb-2 book-text-zinc-900">Included | NotOffered</p>
                        <ul class="book-font-arial book-space-y-2 book-text-sm book-text-zinc-700 book-h-[21rem] book-overflow-auto">
                            ${await renderAmenities(group.Amenities)}
                        </ul>
                    </div>
                  `;
                    gridContainer.appendChild(card);
                }

                const intervalId = setInterval(() => {
                    const asideContent = document.querySelector(".book-aside__content");
                    if (asideContent) {
                        const tabNav = asideContent.querySelector(".book-tab__navigation__container");
                        if (tabNav) {
                            tabNav.insertAdjacentElement("afterend", fareFamilyHtml);
                            clearInterval(intervalId);
                        }
                    }
                }, 300);
            }
        }
    } catch (error) {
        console.error("setFlightGroup: " + error.message);
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
            const icon = item.isChargeable == 0 ? "check-circle-icon" : "dash-circle-icon";
            output += `<li class="book-flex book-items-center book-gap-2 book-my-1">
              <svg width="${icon === "check-circle-icon" ? 17 : 20}" height="${icon === "check-circle-icon" ? 16 : 20}" class="book-shrink-0">
                  <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
              </svg>
              <span>${item.description}</span>
          </li>`;
        }
        return output;
    } catch (error) {
        console.error("renderAmenities" + error.message);
        return "";
    }
};
/**
 * Scrolls to a specific section within a modal and updates tab navigation.
 * @param {HTMLElement} element - The element triggering the scroll.
 * @param {string} type - The type of content to toggle.
 * @param {string} parent - The parent container class.
 */
const scrollModalContainerItem = (element, type, parent) => {
    try {
        const cardContainer = element.closest(".book-aside__content");
        const target = cardContainer.querySelector(`.${parent}`);

        // Smooth scroll to target
        cardContainer.scroll({ top: target.offsetTop, behavior: 'smooth' });

        // Update tab navigation
        cardContainer.querySelectorAll(".book-tab__navigation__content").forEach(tab =>
            tab.classList.remove("book-active__tab__navigation")
        );
        element.classList.add("book-active__tab__navigation");
        toggleContentApi(target.querySelector(".book-content__api"), type, parent, true);
    } catch (error) {
        console.error("scrollModalContainerItem: " + error.message);
    }
};



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
        sessionSearchStorage = currentSessionSearch ? JSON.parse(currentSessionSearch) : {};

        // Update session ID and expiry
        sessionSearchStorage.SessionId = newSessionId;
        sessionSearchStorage.Expiry = now.getTime() + ttl;

        // Save updated flight search data to sessionStorage
        sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));

        // Initialize flight group UI
        await setFlightGroup(); // Assumed to be defined elsewhere
    } catch (error) {
        console.error("setSession: " + error.message);
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
    } catch (error) {
        console.error("warningConfirm: " + error.message);
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
    } catch (error) {
        console.error("warningReject: " + error.message);
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
const updatePassengerServices = async (element, tableId, description, price, currency) => {
    try {
        const table = document.getElementById(tableId);
        if (!table) throw new Error(`Table with ID ${tableId} not found`);
        const rows = table.getElementsByTagName('tr');

        for (let row of rows) {
            const secondCellText = row.cells[1]?.textContent?.trim();
            if (secondCellText === translate("not_selected")) {
                row.setAttribute("data-id", element.dataset.id);
                row.cells[1].textContent = description;
                row.cells[2].innerHTML = `${new Intl.NumberFormat().format(price)} ${await renderCurrency(currency)}`;
                row.classList.add('book-passenger__row__selected');
                row.cells[2].insertAdjacentHTML("beforeend", `
                    <p class="book-text-red-600 book-mt-1 book-cursor-pointer" onclick="removePassengerServices(this)">
                        ${translate("delete")}
                    </p>
                `);

                let serviceAttr = "";
                let labelAttr = "";
                if (tableId.includes('seat')) {
                    serviceAttr = "data-seatId";
                    labelAttr = "data-label-seat";
                } else if (tableId.includes('meal') || tableId.includes('baggage')) {
                    serviceAttr = "data-serviceId";
                    labelAttr = "data-label-service";
                }

                const rowIndex = row.getAttribute("data-index");
                const passengerContainers = document.querySelectorAll(".book-passengers__container .book-passenger__container");
                passengerContainers.forEach(container => {
                    const containerIndex = container.getAttribute("data-index");
                    if (containerIndex === rowIndex && !container.closest(".book-hidden")) {
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

                originalServiceTotalCost += price;
                updatePrices(
                    parseInt(originalTotalCom) + parseInt(originalServiceTotalCost),
                    parseInt(originalFirstPay) + parseInt(originalServiceTotalCost)
                );

                if (tableId.includes('seat')) {
                    element.classList.add('book-seat__selected');
                }

                const allRowsFilled = Array.from(rows).slice(1).every(r => r.cells[1]?.textContent?.trim() !== translate("not_selected"));
                if (allRowsFilled) {
                    const serviceType = tableId.includes('baggage') ? 'baggage'
                        : tableId.includes('meal') ? 'meal'
                            : tableId.includes('seat') ? 'seat'
                                : 'unknown';

                    const currentRouteSection = table.closest('.book-route__service');
                    const serviceContainer = table.closest('.book-services__content');
                    const allRouteSections = serviceContainer?.querySelectorAll('.book-route__service');
                    const currentRouteIndex = Array.from(allRouteSections).indexOf(currentRouteSection);

                    if (currentRouteIndex < allRouteSections.length - 1) {
                        const nextRouteSection = allRouteSections[currentRouteIndex + 1];
                        const nextRouteId = nextRouteSection.id;
                        const parentContainer = nextRouteSection.closest('.book-excessService__content');
                        const nextRouteHeader = parentContainer?.querySelector('.book-flex[onclick*="toggleServiceTable"]');

                        if (nextRouteHeader) {
                            toggleServiceTable(nextRouteHeader, nextRouteId);
                        }
                    }
                }

                break;
            }
        }
    } catch (error) {
        console.error("updatePassengerServices: " + error.message);
    }
};


/**
 * Removes a selected service from the passenger table and updates prices.
 * @param {HTMLElement} element - The element triggering the service removal (e.g., "حذف" link).
 * @returns {void}
 */
const removePassengerServices = (element) => {
    try {
        const row = element.closest('tr');
        if (!row) throw new Error("Parent row not found");

        const idToRemove = row.getAttribute("data-id");
        const labelToRemove = row.cells[1]?.textContent?.trim();
        if (!idToRemove || !labelToRemove) throw new Error("Service ID or label not found");

        const rawPriceText = row.cells[2]?.textContent?.split(' ')[0] || "";
        const priceNumber = parseInt(rawPriceText.replace(/[^\d]/g, ''), 10);
        if (isNaN(priceNumber)) throw new Error("Invalid price format");

        // Reset row
        row.cells[1].textContent = translate("not_selected");
        row.cells[2].textContent = translate("dash_value");
        row.setAttribute("data-id", "");
        row.classList.remove('book-passenger__row__selected');

        const closestRendering = row.closest(
            ".book-api__container__rendering__seatService, .book-api__container__rendering__baggageService, .book-api__container__rendering__mealService"
        );
        if (!closestRendering) throw new Error("Rendering container not found");

        let serviceAttr = "";
        let labelAttr = "";
        if (closestRendering.classList.contains("book-api__container__rendering__seatService")) {
            serviceAttr = "data-seatId";
            labelAttr = "data-label-seat";
        } else if (
            closestRendering.classList.contains("book-api__container__rendering__baggageService") ||
            closestRendering.classList.contains("book-api__container__rendering__mealService")
        ) {
            serviceAttr = "data-serviceId";
            labelAttr = "data-label-service";
        }

        const rowIndex = row.getAttribute("data-index");
        if (!rowIndex) throw new Error("Row index not found");

        const passengerContainers = document.querySelectorAll(".book-passengers__container .book-passenger__container");
        passengerContainers.forEach(container => {
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

                    const filteredArray = currentArray.filter(id => id !== idToRemove);
                    container.setAttribute(serviceAttr, JSON.stringify(filteredArray));

                    let currentLabels = container.getAttribute(labelAttr);
                    let labelArray = currentLabels ? currentLabels.split(",") : [];
                    const filteredLabels = labelArray.filter(l => l !== labelToRemove);
                    container.setAttribute(labelAttr, filteredLabels.join(","));
                }
            }
        });

        if (serviceAttr === "data-seatId") {
            const seatElement = document.querySelector(`[data-id="${idToRemove}"].book-seat__selected`);
            if (seatElement) {
                seatElement.classList.remove("book-seat__selected");
                seatElement.querySelectorAll('.book-seat__part')?.forEach(el => {
                    el.setAttribute('fill', '#3b82f6');
                });
            }
        }

        originalServiceTotalCost -= priceNumber;
        updatePrices(
            parseInt(originalTotalCom) + parseInt(originalServiceTotalCost),
            parseInt(originalFirstPay) + parseInt(originalServiceTotalCost)
        );
    } catch (error) {
        console.error("removePassengerServices: " + error.message);
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
            const expiryMessage = document.querySelector(".book-expire__message__container");
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
    } catch (error) {
        console.error("getWithExpiry: " + error.message);
        return null;
    }
}

/**
 * Adds passenger elements to the UI based on counts for adults, children, and infants.
 * @param {string} parentSelector - CSS selector for the parent container.
 * @param {number} adults - Number of adult passengers.
 * @param {number} children - Number of child passengers.
 * @param {number} infants - Number of infant passengers.
 */
const addPassenger = (parentSelector, adults, children, infants) => {
    try {
        const FlightId = sessionBookStorage.FlightId;
        const parent = document.querySelector(parentSelector);
        const templateElement = parent.querySelector('.book-passenger__container');
        parent.innerHTML = ''; // پاک‌سازی محتوای قبلی
        let dataIndex = 1;
        let adultCounter = 1, childCounter = 1, infantCounter = 1;

        const ordinalKeys = [
            "first", "second", "third", "fourth", "fifth",
            "sixth", "seventh", "eighth", "ninth", "tenth"
        ];

        const typeKeys = {
            "ADT": "passenger_adult",
            "CHD": "passenger_child",
            "INF": "passenger_infant"
        };

        const addCategory = (typeKey, count, counter, typeCode) => {
            for (let i = 0; i < count; i++) {
                const newElement = templateElement.cloneNode(true);
                newElement.setAttribute('data-index', dataIndex);

                // Update radio input names for uniqueness
                const typeContainer = newElement.querySelector(".book-passenger__container__type");
                if (typeContainer) {
                    typeContainer.querySelectorAll("input[type=radio]").forEach(e => {
                        e.setAttribute('name', `type-${dataIndex}`);
                    });
                }

                newElement.querySelector(".book-previous__passenger__container").setAttribute('data-index', dataIndex);
                newElement.querySelector(".book-Type").value = typeCode;

                const ordinalKey = ordinalKeys[counter - 1] || `${counter}`;
                const title = `${translate(typeKey)} ${translate(ordinalKey)}`;

                newElement.querySelector(".book-passenger__container__title").textContent = title;
                parent.appendChild(newElement);

                dataIndex++;
                counter++;
            }
        };

        addCategory("passenger_adult", adults, adultCounter, "ADT");
        addCategory("passenger_child", children, childCounter, "CHD");
        addCategory("passenger_infant", infants, infantCounter, "INF");
    } catch (error) {
        console.error("addPassenger: " + error.message);
    }
};


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
        field.closest(".book-info__item__container").insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${message}</div>`);
    } catch (error) {
        console.error("addError: " + error.message);
    }
}

/**
 * Adds an error message for a date field and marks date components as invalid.
 * @param {string} message - The error message to display.
 * @param {HTMLElement} dateField - The date input field.
 */
const addDateError = (message, dateField) => {
    try {
        // Mark year, month, and day components as invalid
        ["year", "month", "day"].forEach(item => {
            const component = dateField.closest(".book-info__item__container").querySelector(`.book-${item}`);
            if (component) {
                component.closest(".book-info__item__content").classList.add("book-invalid");
            }
        });
        // Insert error message if not already present
        if (!dateField.closest(".book-info__item__container").querySelector(".book-alert__content")) {
            dateField.closest(".book-info__item__container").insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${message}</div>`);
        }
    } catch (error) {
        console.error("addDateError: " + error.message);
    }
}

/**
 * Removes error state and message from a date field.
 * @param {HTMLElement} dateField - The date input field.
 */
const removeDateError = (dateField) => {
    try {
        // Remove invalid state from year, month, and day components
        ["year", "month", "day"].forEach(item => {
            const component = dateField.closest(".book-info__item__container").querySelector(`.book-${item}`);
            if (component) {
                component.closest(".book-info__item__content").classList.remove("book-invalid");
            }
        });
        // Remove all error messages
        dateField.closest(".book-info__item__container").querySelectorAll(".book-alert__content").forEach(desc => desc.remove());
    } catch (error) {
        console.error("removeDateError: " + error.message);
    }
}

/**
 * Removes error state and message from a field.
 * @param {HTMLElement} field - The input field.
 */
const removeError = (field) => {
    try {
        // Remove invalid state from the field container
        field.closest(".book-info__item__content").classList.remove("book-invalid");
        // Remove all error messages
        field.closest(".book-info__item__container").querySelectorAll(".book-alert__content").forEach(desc => desc.remove());
    } catch (error) {
        console.error("removeError: " + error.message);
    }
}

/**
 * Removes alert content and invalid state from an element's container.
 * @param {HTMLElement} element - The element associated with the alert.
 */
const removeAlertContent = (element) => {
    try {
        // Remove alert content if present
        const alertContent = element.closest(".book-info__item__container").querySelector(".book-alert__content");
        if (alertContent) {
            alertContent.remove();
        }
        // Remove invalid state from info item content
        const infoContent = element.closest(".book-info__item__content");
        if (infoContent && infoContent.classList.contains("book-invalid")) {
            infoContent.classList.remove("book-invalid");
        }
        // Remove invalid state from gender field if present
        const genderField = element.closest(".book-info__item__container").querySelector(".book-info__item__content .book-Gender");
        if (genderField && genderField.closest(".book-info__item__content").classList.contains("book-invalid")) {
            genderField.closest(".book-info__item__content").classList.remove("book-invalid");
        }
    } catch (error) {
        console.error("removeAlertContent: " + error.message);
    }
}



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
                document.querySelector(".book-totalcom__cost").textContent = new Intl.NumberFormat().format(totalcomPrice);
            }
            document.querySelector(".book-firstpay__cost").textContent = new Intl.NumberFormat().format(firstpayPrice);
        } else {
            // Fallback to original costs plus service total
            const firstpayPrice = parseInt(originalFirstPay) + parseInt(originalServiceTotalCost);
            document.querySelector(".book-firstpay__cost").textContent = new Intl.NumberFormat().format(firstpayPrice);
            if (totalcom !== undefined) {
                const totalcomPrice = parseInt(originalTotalCom) + parseInt(originalServiceTotalCost);
                document.querySelector(".book-totalcom__cost").textContent = new Intl.NumberFormat().format(totalcomPrice);
            }
        }
    } catch (error) {
        console.error("updatePrices: " + error.message);
    }
}

/**
 * Updates the booking step UI and attributes.
 * @param {string} stepName - Name of the current step (e.g., '${translate("passengerInfo")}<', 'مشخصات خریدار').
 * @param {HTMLElement} element - The element triggering the step update.
 */
const updateStep = (stepName, element) => {
    try {
        // Update the current step display
        const routeMap = document.querySelector(".book-current__route__map");
        if (routeMap) {
            routeMap.innerText = stepName;
        }

        // Determine if current step is passenger info
        const isPassengerStep = stepName === translate("passengerInfo");

        // Set data-step attributes based on step
        element.setAttribute("data-step", isPassengerStep ? "" : "buyer");
        const nextElement = element.nextElementSibling;
        if (nextElement) {
            nextElement.setAttribute("data-step", isPassengerStep ? "passenger" : "buyer");
        }

        // Update step items UI
        updateStepItems(isPassengerStep ? "passenger" : "buyer");
    } catch (error) {
        console.error("updateStep: " + error.message);
    }
};


/**
 * Updates the active state of step navigation items.
 * @param {string} element - The step identifier (e.g., 'passenger', 'buyer').
 */
const updateStepItems = (element) => {
    try {
        const stepItems = document.getElementsByClassName('book-route__map__item');
        Array.from(stepItems).forEach(item => {
            const isCurrentStep = item.getAttribute("data-step") === element;
            // Remove active state from all items
            item.classList.remove("book-route__map__item__active");
            // Add active state to the current step
            if (isCurrentStep) {
                item.classList.add("book-route__map__item__active");
            }
        });
    } catch (error) {
        console.error("updateStepItems: " + error.message);
    }
}
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

            const container = element.closest(".book-info__item__container");

            // Avoid duplicating alert
            if (!container.querySelector(".book-alert__content")) {
                container.insertAdjacentHTML('beforeend',
                    `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("keyboardSwitchMessage")}</div>`);
            }

            return false;
        }

        // Remove invalid state if valid key
        element.closest(".book-info__item__content").classList.remove("book-invalid");
        const alert = element.closest(".book-info__item__container")?.querySelector(".book-alert__content");
        if (alert) alert.remove();

        return true;
    } catch (error) {
        console.error("checkEnglishKey: " + error.message);
        return false;
    }
}


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
            elementSplited[i] = elementSplited[i].charAt(0).toUpperCase() + elementSplited[i].slice(1);
        }
        element.value = elementSplited.join(" ");
    } catch (error) {
        console.error("checkUpperCaseKey: " + error.message);
    }
}

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
        return regex.test(event.key) && event.key !== ' ';
    } catch (error) {
        console.error("checkPersianKey: " + error.message);
        return false;
    }
}

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
        const passengerContainers = document.getElementsByClassName("book-passenger__container");
        for (let i = 0; i < passengerContainers.length; i++) {
            const dropContents = passengerContainers[i].getElementsByClassName("book-drop__item__content");
            for (let j = 0; j < dropContents.length; j++) {
                if (dropContents[j].classList.contains("book-drop__item__content-toggle")) {
                    // Filter visible items (not hidden)
                    const items = Array.from(
                        dropContents[j].getElementsByClassName("book-li-item")
                    ).filter(item => !item.classList.contains("book-hidden"));
                    const len = items.length - 1;

                    if (e.keyCode === 38) { // Up arrow
                        if (itemSelected) {
                            liNotSelected(itemSelected, "book-selected");
                            index--;
                            const next = items[index];
                            if (typeof next !== 'undefined' && index >= 0) {
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
                    } else if (e.keyCode === 40) { // Down arrow
                        index++;
                        if (itemSelected) {
                            const next = items[index];
                            if (typeof next !== 'undefined' && index <= len) {
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
                    } else if (e.keyCode === 13) { // Enter
                        if (items[index]) {
                            items[index].click();
                            items[index].classList.remove("book-selected");
                            index = -1;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("checkKey: " + error.message);
    }
}

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
            el.className += ' ' + className;
        }
    } catch (error) {
        console.error("liSelected: " + error.message);
    }
}

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
            el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    } catch (error) {
        console.error("liNotSelected: " + error.message);
    }
}

/**
 * Retrieves a cookie value by name.
 * @param {string} name - The name of the cookie.
 * @returns {string|null} The cookie value or null if not found.
 */
const getCookie = (name) => {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    } catch (error) {
        console.error("getCookie: " + error.message);
        return null;
    }
}

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
    } catch (error) {
        console.error("getFieldValue: " + error.message);
        return defaultValue;
    }
}

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
        const codeNumber = container.closest(".book-info__item__container").querySelector(".book-code__number");
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
                    input.value = `${element.querySelector(".book-counter__firstName").textContent} ${element.querySelector(".book-counter__lastName").textContent}`;
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
        container.querySelector(".book-drop__item__content").classList.remove("book-drop__item__content-toggle");

        // Handle date item content
        if (type === 'book-date__item__content') {
            createDate(element.closest(".book-date__item__content"));
        }

        // Handle PlaceOfBirth logic for NationalCode field
        const placeOfBirth = container.querySelector(".book-PlaceOfBirth");
        if (placeOfBirth && element.closest(".book-passengers__container__external")) {
            const nationalCode = element.closest(".book-passenger__container").querySelector(".book-NationalCode");
            if (placeOfBirth.value === '1002236') {
                nationalCode.value = '';
                nationalCode.removeAttribute("readonly");
                nationalCode.classList.add("book-Required");
                nationalCode.classList.remove("book-not-active");
            } else {
                nationalCode.value = '-';
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
            apiContainer.querySelector(".book-api__container__loader").classList.remove("book-hidden");
            apiContainer.classList.add("book-rendering__info__api");
            $bc.setSource(`cms.${api}`, {
                id: element.querySelector(".book-id").value,
                run: true
            });
            const requiredField = apiContainer.querySelector(".book-Required");
            if (requiredField) {
                requiredField.setAttribute("data-id", element.querySelector(".book-id").value);
            }
        }
    } catch (error) {
        console.error("selectDropItem: " + error.message);
    }
}





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
        const passengerIndexRoom = isPassenger ? element.closest(".book-passenger").getAttribute("data-index") : null;

        if (mainUserId === "0") {
            // Update form fields for login
            const forms = loginSection.getElementsByTagName("form");
            Array.from(forms).forEach(form => {
                form.querySelector(".passengerList-key").value = 1;
                form.querySelector(".dmnid-key").value = layoutContainer.getAttribute("data-dmnid");
                form.querySelector(".index-key").value = passengerIndex;
                if (isPassenger) {
                    form.querySelector(".index-room-key").value = passengerIndexRoom;
                }
            });
            showLoginContainer();
        } else {
            const prevPassengers = element.getAttribute("data-run") === "0";
            const passengerInfoElements = document.getElementsByClassName("book-passenger__container");

            if (prevPassengers) {
                // Show next sibling and set data-run for all passengers
                element.nextElementSibling.classList.remove("book-hidden");
                Array.from(passengerInfoElements).forEach(infoContent => {
                    if (!infoContent.parentElement.classList.contains("book-hidden")) {
                        const passengers = infoContent.getElementsByClassName("book-passenger");
                        if (passengers.length > 0) {
                            Array.from(passengers).forEach(passenger => {
                                passenger.querySelector(".book-previous__passenger__container").setAttribute("data-run", "1");
                                passenger.querySelector(".book-previous__passenger__container").classList.remove("book-selected__passenger");
                            });
                        } else {
                            infoContent.querySelector(".book-previous__passenger__container").setAttribute("data-run", "1");
                            infoContent.classList.remove("book-selected__passenger");
                        }
                    }
                });
                let cookieValue = `; ${document.cookie}`;
                let match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
                let rkey = match ? match[1] : null;
                $bc.setSource("cms.previousPassengers", { rkey: rkey });
                element.closest(".book-passenger__container").classList.add("book-selected__passenger");
            } else {
                // Show previous passengers container and update selected state
                const previousPassengersContainer = document.querySelector(".book-previous__passengers__container");
                if (previousPassengersContainer.classList.contains("book-hidden")) {
                    previousPassengersContainer.classList.remove("book-hidden");
                }
                Array.from(passengerInfoElements).forEach(infoContent => {
                    if (!infoContent.parentElement.classList.contains("book-hidden")) {
                        const passengers = infoContent.getElementsByClassName("book-passenger");
                        if (passengers.length > 0) {
                            Array.from(passengers).forEach(passenger => {
                                passenger.querySelector(".book-previous__passenger__container").classList.remove("book-selected__passenger");
                            });
                        } else {
                            infoContent.classList.remove("book-selected__passenger");
                        }
                    }
                });
                element.closest(".book-passenger__container").classList.add("book-selected__passenger");
            }
        }
    } catch (error) {
        console.error("showPreviousPassengers: " + error.message);
    }
}

/**
 * Displays the booking summary and updates user data via API.
 * @param {HTMLElement} element - The element triggering the summary display.
 */
const showSummaryContent = (element) => {
    try {
        const summaryInfoContent = document.querySelector(".book-summary__container");
        const stepTitle = document.querySelector(".book-current__route__map");
        const summaryPassengerItems = document.querySelector(".book-summary__item");
        const summaryBuyerItems = document.querySelector(".book-summary-buyer-items");
        const summaryServiceItems = document.querySelector(".book-summary-service-items");
        const mainUserId = document.querySelector(".main-userid").value;

        summaryInfoContent.classList.remove("book-hidden");
        stepTitle.innerText = translate("payment_and_issue");
        element.setAttribute("data-step", "summary");
        element.previousElementSibling.setAttribute("data-step", "summary");
        updateStepItems("summary");

        summaryPassengerItems.innerHTML = "";
        summaryBuyerItems.innerHTML = "";
        if (summaryServiceItems) summaryServiceItems.innerHTML = "";

        // Buyer info setup
        const buyerInfoContents = document.querySelectorAll(".book-buyer__info__content");
        buyerInfoContents.forEach(content => {
            const numberItems = content.querySelectorAll(".book-number__item__container");
            numberItems.forEach(item => {
                const telInput = item.querySelector(".book-tel");
                const mobileInput = item.querySelector(".book-mobile");
                const code = item.querySelector(".book-code");
                if (telInput) {
                    const telInfo = item.querySelector(".book-tel__number");
                    telInfo.value = telInput.value === "-" ? "-" : code.value + telInput.value;
                }
                if (mobileInput) {
                    const mobileInfo = item.querySelector(".book-mobile__number");
                    mobileInfo.value = code.value + mobileInput.value;
                }
            });
        });

        // Update changed fields
        const properties = [];
        document.querySelectorAll(".book-check__has__data input").forEach(e => {
            if (e.dataset.changed === "1") {
                const obj = {
                    [e.dataset.id ? "edited" : "added"]: [{
                        ...(e.dataset.id && { id: e.dataset.id }),
                        parts: [{
                            part: 1,
                            values: [{
                                ...(e.dataset.valueid && { id: e.dataset.valueid }),
                                value: e.value
                            }]
                        }]
                    }],
                    multi: false,
                    propId: e.dataset.prpid || '""'
                };
                properties.push(obj);
            }
        });

        if (properties.length > 0) {
            const objEditUser = JSON.stringify({
                data: {
                    lid: 1,
                    paramUrl: `/${document.querySelector(".book-check__has__data").dataset.hashid}/fa/schema_name`,
                    properties,
                    schemaId: document.querySelector(".book-check__has__data").dataset.hashid,
                    schemaVersion: "1.0.0",
                    usedForId: mainUserId
                }
            });
            $bc.setSource("cms.editUser", {
                objEditUser,
                rkey: getCookie("rkey"),
                run: true
            });
        }

        // Passenger summary rendering
        const passengerInfoContents = document.querySelectorAll(".book-passenger__container");
        passengerInfoContents.forEach(content => {
            if (!content.parentElement.classList.contains("book-hidden")) {
                const element = document.createElement("div");
                element.className = "book-summary__bodys book-grid book-gap-1 book-mb-4";
                const numberItems = content.querySelectorAll(".book-info__item__container");

                numberItems.forEach(item => {
                    if (!item.classList.contains("book-hidden")) {
                        const label = item.querySelector("label")?.getAttribute("data-label");
                        const inputValue = item.querySelector("input")?.value || "";
                        const hiddenInput = item.querySelector("input[type=hidden]");
                        const hiddenInputValue = hiddenInput?.value || "";

                        const div = document.createElement("div");
                        div.className = "book-mb-3";
                        if (hiddenInput && (hiddenInput.classList.contains("book-PlaceOfBirth") || hiddenInput.classList.contains("book-PassportIssueCountry"))) {
                            div.innerHTML = `
                                <div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div>
                                <div class="book-summary__body book-font-bold">${inputValue}</div>`;
                        } else {
                            div.innerHTML = `
                                <div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div>
                                <div class="book-summary__body book-font-bold">${hiddenInputValue || inputValue}</div>`;
                        }
                        element.appendChild(div);
                    }
                });

                // Service and seat labels
                const serviceLabel = content.getAttribute("data-label-service");
                const seatLabel = content.getAttribute("data-label-seat");

                if (serviceLabel) {
                    const div = document.createElement("div");
                    div.className = "book-mb-3";
                    div.innerHTML = `
                        <div class="book-summary__head book-text-zinc-500 book-mb-1">${translate("services")}</div>
                        <div class="book-summary__body book-font-bold">${serviceLabel}</div>`;
                    element.appendChild(div);
                }

                if (seatLabel) {
                    const div = document.createElement("div");
                    div.className = "book-mb-3";
                    div.innerHTML = `
                        <div class="book-summary__head book-text-zinc-500 book-mb-1">${translate("selected_seat")}</div>
                        <div class="book-summary__body book-font-bold">${seatLabel}</div>`;
                    element.appendChild(div);
                }

                summaryPassengerItems.appendChild(element);
            }
        });

        // Buyer summary rendering
        const buyerItems = document.querySelector(".book-buyer__info__content");
        if (buyerItems && !buyerItems.classList.contains("book-counter__info__content")) {
            const element = document.createElement("div");
            element.className = "book-summary__bodys book-grid book-grid-cols-4 book-gap-1";
            const buyerNumberItems = buyerItems.querySelectorAll(".book-info__item__container");
            buyerNumberItems.forEach(item => {
                if (!item.closest(".book-more__buyer__info__container") && !item.classList.contains("book-hidden")) {
                    const label = item.querySelector("label")?.innerText;
                    const inputElement = item.querySelector("input");
                    const hiddenInputElement = item.querySelector("input[type=hidden]");
                    let inputValue = inputElement?.value || "";
                    let hiddenInputValue = hiddenInputElement?.value || "";
                    let dirClass = "book-rtl";

                    if (inputElement?.classList.contains("book-gender")) {
                        hiddenInputValue = inputValue === "0" ? translate("male") : translate("female");
                    }

                    if (inputElement?.classList.contains("book-mobile") || inputElement?.classList.contains("book-tel")) {
                        dirClass = "book-ltr";
                    }

                    const hasSelectedAgencyClass = inputElement?.classList.contains("book-selected__agency") ||
                        hiddenInputElement?.classList.contains("book-selected__agency");

                    if (!hasSelectedAgencyClass) {
                        const div = document.createElement("div");
                        div.className = "book-mb-3";
                        div.innerHTML = `
                            <div class="book-summary__head book-text-zinc-500 book-mb-1">${label}</div>
                            <div class="book-summary__body book-font-bold ${dirClass}">${hiddenInputValue || inputValue}</div>`;
                        element.appendChild(div);
                    }
                }
            });
            summaryBuyerItems.appendChild(element);
        }

        // Optional counter section (based on domainId)

        if ([2452, 3812, 4204, 4787, 4705, 2475].includes(parseInt(domainId))) {
            const counterContent = document.querySelector(".book-counter__container");
            counterContent.style.display = "block";
            counterContent.classList.add("book-Required");
        }

    } catch (error) {
        console.error("showSummaryContent: " + error.message);
    }
};


/**
 * Filters dropdown items based on input value for autocomplete functionality.
 * @param {HTMLElement} element - The input element.
 * @param {string} type - The container class type (e.g., 'info__item__container').
 */
const autoCompleteSearch = (element, type) => {
    try {
        const dropContent = element.closest(`.${type}`).querySelector(".book-drop__item__content");

        if (!dropContent.classList.contains("book-drop__item__content-toggle")) {
            dropContent.classList.add("book-drop__item__content-toggle");
        }

        let count = 0;
        dropContent.querySelectorAll("li").forEach(e => {
            const matches = e.dataset.value
                ? e.dataset.value.toLowerCase().includes(element.value.toLowerCase()) || e.dataset.id.toLowerCase().includes(element.value.toLowerCase())
                : e.innerText.toLowerCase().includes(element.value.toLowerCase());

            if (matches) {
                count++;
                e.classList.remove('book-hidden');
            } else {
                e.classList.add('book-hidden');
            }
        });

        if (count === 0) {
            dropContent.insertAdjacentHTML('beforeend', `<li class="book-nodata book-p-2" data-value="" data-id="">${translate("no_result_found")}</li>`);
        } else {
            const noData = dropContent.querySelector(".book-nodata");
            if (noData) noData.remove();
        }
    } catch (error) {
        console.error("autoCompleteSearch: " + error.message);
    }
}


/**
 * Clears input value if no data-id is set.
 * @param {HTMLElement} element - The input element.
 * @param {string} type - The container class type.
 */
const autoFillSearch = (element, type) => {
    try {
        if (element.getAttribute("data-id") === '') {
            element.value = '';
        }
    } catch (error) {
        console.error("autoFillSearch: " + error.message);
    }
}

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
        let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
        j_day_no += this.j_days_in_month.slice(0, j_m).reduce((a, b) => a + b, 0) + j_d;

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

        gm = String(gm + 1).padStart(2, '0');
        gd = String(gd).padStart(2, '0');

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

            const [year, month, day] = dateStr.split('-').map(Number);
            if (year < 1300 || year > 1500 || month < 1 || month > 12) return false;

            let maxDays = this.j_days_in_month[month - 1];
            if (month === 12 && this.isLeapJalali(year)) maxDays = 30;
            return day >= 1 && day <= maxDays;
        } catch (error) {
            console.error("isPersianDate: " + error.message);
            return false;
        }
    }
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
        dateInput.value = `${container.querySelector(".book-year").getAttribute("data-id")}-` +
            `${container.querySelector(".book-month").getAttribute("data-id")}-` +
            `${container.querySelector(".book-day").getAttribute("data-id")}`;

        // Remove invalid state
        element.querySelector("input").closest(".book-info__item__content").classList.remove("book-invalid");
        // Validate and convert date if all fields are filled
        if (container.querySelector(".book-year").value !== '' &&
            container.querySelector(".book-month").value !== '' &&
            container.querySelector(".book-day").value !== '') {
            const alertContent = container.querySelector(".book-alert__content");
            if (alertContent) {
                alertContent.remove();
            }
            if (element.closest(".book-date__item__container").classList.contains("book-internal")) {
                const regex = /^\d{4}-\d{2}-\d{2}$/;
                const new_date = dateInput.value;
                const [check_year, check_month, check_day] = new_date.split("-").map(Number);
                const leapYears = [1300, 1309, 1313, 1317, 1321, 1325, 1329, 1333, 1337, 1342, 1346, 1350, 1354, 1358, 1362, 1366, 1370, 1375, 1379, 1383, 1387, 1391, 1395, 1399, 1403, 1408, 1412, 1416, 1420, 1424, 1428, 1432, 1436, 1441];

                function isLeapYearInList(check_year) {
                    const year = parseFloat(check_year);
                    return leapYears.includes(year);
                }

                if (check_month > 6 && check_day > 30) {
                    return false;
                } else if (check_month === 12 && check_day === 30) {
                    if (isLeapYearInList(check_year)) {
                        if (parseFloat(check_year) > 1300 && parseFloat(check_year) < 1500) {
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
    } catch (error) {
        console.error("createDate: " + error.message);
    }
}

/**
 * Converts a Jalali date to Gregorian and updates the input value.
 * @param {HTMLElement} element - The container element with the date input.
 */
const checkDate = (element) => {
    try {
        if (JalaliDate.isPersianDate(element)) {
            const [j_y, j_m, j_d] = element.split('-').map(Number);
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
    // Get all tab buttons and the parent service container
    const buttons = document.querySelectorAll('.book-tab__navigation__content');
    const servicesContainer = element.closest('.book-services__container');
    const contentContainer = servicesContainer.querySelector('.book-api__container__content');

    if (!contentContainer) return;

    // Remove active class from all buttons
    buttons.forEach(button => button.classList.remove('book-active__tab__navigation'));
    // Add active class to the clicked button
    element.classList.add('book-active__tab__navigation');

    // Helper function to hide all service tabs
    const hideAllTabs = () => {
        ['baggageService', 'mealService', 'seatService'].forEach(type => {
            const container = servicesContainer.querySelector(`.book-api__container__rendering__${type}`);
            if (container) container.classList.add('book-hidden');
        });
    };

    // Hide all tabs initially
    hideAllTabs();

    // Try to show the target tab if it already exists
    const targetContainer = contentContainer.querySelector(`.book-api__container__rendering__${tabType}`);
    if (targetContainer) {
        targetContainer.classList.remove('book-hidden');
    } else {
        // If the tab hasn’t been rendered yet, wait for it using MutationObserver
        const observer = new MutationObserver(() => {
            const added = contentContainer.querySelector(`.book-api__container__rendering__${tabType}`);
            if (added) {
                hideAllTabs(); // Ensure all other tabs are hidden again
                added.classList.remove('book-hidden');
                observer.disconnect();
            }
        });
        observer.observe(contentContainer, { childList: true, subtree: true });
    }

    // If this tab hasn't been triggered yet, send the API request
    if (element.dataset.run === '0') {
        contentContainer.classList.add('book-api__container__rendering');

        // If loader doesn't exist, add one
        if (!contentContainer.querySelector('.book-api__container__loader')) {
            const loader = document.createElement('span');
            loader.className = 'book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-my-3';
            contentContainer.appendChild(loader);
        }

        // Mark this tab as already run
        element.dataset.run = '1';

        // If it's ExcessService, mark all relevant tabs as run
        if (serviceType === 'ExcessService') {
            buttons.forEach(button => {
                const onclickMatch = button.getAttribute('onclick')?.match(/'([^']+)'/g);
                const buttonTabType = onclickMatch?.[1]?.replace(/'/g, '');
                if (buttonTabType === 'ExcessService') {
                    button.dataset.run = '1';
                }
            });
        }

        // Prepare and send the API request
        const cookieValue = `; ${document.cookie}`;
        const match = cookieValue.match(/(?:^|;\s*)rkey=([^;]*)/);
        const rkey = match ? match[1] : null;

        $bc.setSource("cms.rule", {
            type: serviceType,
            SessionId: sessionSearchStorage.SessionId,
            FlightId: sessionBookStorage.FlightId,
            FlightGroup: JSON.stringify(sessionBookStorage.FlightGroup),
            rkey: rkey,
            run: true
        });
    }

    // In any case, make sure the content container is visible
    contentContainer.classList.remove('book-hidden');
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
const selectPreviousPassenger = (element, event, firstName, lastName, nationalCode, birthDate, gender, issueCountryName, issueCountryId, passportExpiration, passportCode) => {
    try {
        const selectedPassenger = document.querySelector(".book-selected__passenger");
        if (!selectedPassenger) throw new Error("Selected passenger container not found");

        // Update basic passenger fields
        selectedPassenger.querySelector('.book-FirstName').value = firstName;
        selectedPassenger.querySelector('.book-LastName').value = lastName;

        // Set gender and corresponding data-id
        const genderField = selectedPassenger.querySelector('.book-Gender');
        const genderDataId = genderField.closest(".book-info__item__container").querySelector(".book-data-id");
        if (String(gender) === "1") {
            genderField.value = translate("male");
            genderDataId.value = "MR";
        } else {
            genderField.value = translate("female");
            genderDataId.value = "MS";
        }

        // Update national code and passport code
        selectedPassenger.querySelector('.book-NationalCode').value = nationalCode;
        selectedPassenger.querySelector('.book-PassportCode').value = passportCode;

        // Update passport expiration date
        if (passportExpiration) {
            const passportDateParts = passportExpiration.split("-");
            if (passportDateParts.length === 3) {
                const passportContainer = selectedPassenger.querySelector('.book-PassportExpiration').closest(".book-date__item__container");
                selectedPassenger.querySelector('.book-PassportExpiration').value = passportExpiration;
                passportContainer.querySelector(".book-day").value = passportDateParts[2];
                passportContainer.querySelector(".book-day").dataset.id = passportDateParts[2];
                passportContainer.querySelector(".book-month").value = passportDateParts[1];
                passportContainer.querySelector(".book-month").dataset.id = passportDateParts[1];
                passportContainer.querySelector(".book-year").value = passportDateParts[0];
                passportContainer.querySelector(".book-year").dataset.id = passportDateParts[0];
            }
        }

        // Update birth date
        if (birthDate) {
            const birthDateParts = birthDate.split("-");
            if (birthDateParts.length === 3) {
                const birthContainer = selectedPassenger.querySelector('.book-DateOfBirth').closest(".book-date__item__container");
                selectedPassenger.querySelector('.book-DateOfBirth').value = birthDate;
                birthContainer.querySelector(".book-day").value = birthDateParts[2];
                birthContainer.querySelector(".book-day").dataset.id = birthDateParts[2];
                birthContainer.querySelector(".book-month").value = birthDateParts[1];
                birthContainer.querySelector(".book-month").dataset.id = birthDateParts[1];
                birthContainer.querySelector(".book-year").value = birthDateParts[0];
                birthContainer.querySelector(".book-year").dataset.id = birthDateParts[0];
            }
        }

        // Update country and place of birth
        selectedPassenger.querySelector('.book-NameOfCountry').value = issueCountryName;
        selectedPassenger.querySelector('.book-PlaceOfBirth').value = issueCountryId;

        // Hide previous passengers UI
        element.closest(".book-previous__passengers__container")?.classList.add("book-hidden");
        element.closest(".book-select__item__content")?.classList.add("book-hidden");
    } catch (error) {
        console.error("selectPreviousPassenger: " + error.message);
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
        const existingLoader = invoiceContainer.querySelector(".book-invoice__loader_container");
        if (existingLoader) {
            existingLoader.remove();
        }

        if (type === 'pre__Invoice') {
            const invoiceContent = invoiceContainer.querySelector(".book-invoice__content");
            invoiceContent.insertAdjacentHTML('beforeend',
                `<div class="book-invoice__loader_container book-mt-2 book-text-center">${translate("generating_pre_invoice_wait")}</div>`);
            invoiceContent.classList.add("book-not-active");
            document.querySelector(".book-bankIdentifier").value = -1;
            if (element.getAttribute("data-run") === "0") {
                element.setAttribute("data-run", "1");
                sendDataWithFetch();
            }
        } else if (element.getAttribute("data-run") === "0") {
            const invoiceContents = invoiceContainer.getElementsByClassName('book-invoice__content');
            for (let i = 0; i < invoiceContents.length; i++) {
                invoiceContents[i].setAttribute("data-run", "1");
                invoiceContents[i].classList.add("book-not-active");
            }

            if (type === 'bank__Invoice') {
                document.querySelector(".book-payType").value = "bank";
                document.querySelector(".book-clear").value = 0;
                const bankId = element.querySelector(".book-bankId").value;
                document.querySelector(".book-bankIdentifier").value = bankId;

                if (bankId === "-1") {
                    invoiceContainer.insertAdjacentHTML('beforeend',
                        `<div class="book-invoice__loader_container book-mt-2 book-text-center">${translate("generating_pre_invoice_wait")}</div>`);
                    sendDataWithFetch();
                } else if (bankId === "97") {
                    element.setAttribute("data-run", "0");
                    element.classList.remove("book-not-active");
                    invoiceContainer.insertAdjacentHTML('beforeend',
                        `<div class="book-get-bank-info-container book-get-bank-info-container-toggle">
                            <div class="book-bg-get-bank-info-container"></div>
                            <div class="book-main-get-bank-info-container">
                                <div class="book-get-bank-info-closed"><i class="book-fa book-fa-times" onclick="close_bank_info(this)"></i></div>
                                <p class="book-text-sm">${translate("sibank_gateway_instructions")}</p>
                                <p class="book-text-sm book-get-bank-warning">${translate("mobile_national_id_match_note")}</p>
                                <div class="book-info__item__container book-mb-3 book-relative">
                                    <label class="book-mb-1 book-block book-text-zinc-500 book-text-xs">${translate("mobile_number")}</label>
                                    <div class="book-number__item__container">
                                        <div class="book-info__item__content book-bg-zinc-100 book-rounded-lg book-w-11/12 book-transition">
                                            <input type="text" class="book-mobileSiBank book-siBank-info" onkeyup="this.value=this.value.replace(/[^0-9]/g, '');">
                                        </div>
                                    </div>
                                </div>
                                <div class="book-info__item__container book-mb-3 book-relative">
                                    <label class="book-mb-1 book-block book-text-zinc-500 book-text-xs">${translate("national_code")}</label>
                                    <div class="book-number__item__container">
                                        <div class="book-info__item__content book-bg-zinc-100 book-rounded-lg book-w-11/12 book-transition">
                                            <input type="text" class="book-nationalCodeSiBank book-siBank-info" onkeyup="this.value=this.value.replace(/[^0-9]/g, '');">
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="book-btn__content book-text-white book-rounded-2xl book-p-3 book-cursor-pointer book-text-center book-bg-primary-400 book-next__btn hover:book-bg-secondary-400" onclick="siBankIsSubmited(this,element)">
                                    ${translate("submit")}
                                </button>
                            </div>
                        </div>`);
                } else {
                    invoiceContainer.insertAdjacentHTML('beforeend',
                        `<div class="book-invoice__loader_container book-mt-2 book-text-center">${translate("connecting_bank_gateway_wait")}</div>`);
                    sendDataWithFetch();
                }
            } else if (type === 'credit__Invoice') {
                document.querySelector(".book-payType").value = "credit";
                document.querySelector(".book-clear").value = 6;
                invoiceContainer.insertAdjacentHTML('beforeend',
                    `<div class="book-invoice__loader_container book-mt-2 book-text-center">${translate("generating_invoice_wait")}</div>`);
                sendDataWithFetch();
            }
        }
    } catch (error) {
        console.error("submitInvoice: " + error.message);
    }
};


/**
 * Closes the SiBank info modal.
 * @param {HTMLElement} element - The element triggering the close action (e.g., close button).
 */
const close_bank_info = (element) => {
    try {
        element.closest(".book-get-bank-info-container").classList.remove("book-get-bank-info-container-toggle");
    } catch (error) {
        console.error("close_bank_info: " + error.message);
    }
}

/**
 * Submits SiBank info (mobile and national code) and triggers invoice submission.
 * @param {HTMLElement} element - The submit button element.
 * @param {HTMLElement} item - The original invoice element.
 */
const siBankIsSubmited = (element, item) => {
    try {
        let isExist = true;
        // Validate SiBank inputs
        element.closest(".book-get-bank-info-container").querySelectorAll(".book-siBank-info").forEach(e => {
            if (e.value === "") {
                isExist = false;
                e.closest(".book-info__item__content").classList.add("book-invalid");
            } else {
                e.closest(".book-info__item__content").classList.remove("book-invalid");
            }
        });

        if (isExist) {
            // Add hidden inputs for SiBank data
            document.querySelector(".book-invoice-form").insertAdjacentHTML('beforeend',
                `<input type="hidden" value="${element.closest(".book-get-bank-info-container").querySelector(".book-mobileSiBank").value}" name="mobileSiBank"/>
                                     <input type="hidden" value="${element.closest(".book-get-bank-info-container").querySelector(".book-nationalCodeSiBank").value}" name="nationalCodeSiBank"/>`);
            // Close modal and show loader
            const invoiceContainer = element.closest(".book-invoice__container");
            invoiceContainer.querySelector(".book-get-bank-info-container").classList.remove("book-get-bank-info-container-toggle");
            invoiceContainer.insertAdjacentHTML('beforeend',
                `<div class="book-invoice__loader_container book-mt-2 book-text-center">در حال اتصال به درگاه بانک، لطفا منتظر بمانید</div>`);
            sendDataWithFetch();
            // Reset data-run and not-active state
            item.setAttribute("data-run", "0");
            item.classList.remove("book-not-active");
        }
    } catch (error) {
        console.error("siBankIsSubmited: " + error.message);
    }
}

/**
 * Submits booking data via a dynamically created form.
 */

const sendDataWithFetch = () => {
    try {
        let passengerList = [];
        let buyerData = {};

        // Collect passenger data
        document.querySelectorAll(".book-passenger__container").forEach(passengerElement => {
            if (!passengerElement.closest(".book-passengers__content").classList.contains("book-hidden")) {
                const passengerData = {
                    Type: getFieldValue(passengerElement, ".book-Type", "ADT"),
                    FirstName: getFieldValue(passengerElement, ".book-FirstName"),
                    LastName: getFieldValue(passengerElement, ".book-LastName"),
                    Gender: getFieldValue(passengerElement.querySelector(".book-Gender").closest(".book-info__item__container"), ".book-data-id"),
                    PassportCode: getFieldValue(passengerElement, ".book-PassportCode"),
                    PassportExpiration: getFieldValue(passengerElement, ".book-PassportExpiration"),
                    NationalCode: getFieldValue(passengerElement, ".book-NationalCode"),
                    DateOfBirth: getFieldValue(passengerElement, ".book-DateOfBirth"),
                    PlaceOfBirth: getFieldValue(passengerElement, ".book-PlaceOfBirth"),
                };
                // بررسی و اضافه کردن seatId در صورت وجود
                const seatIdAttr = passengerElement.getAttribute("data-seatId");
                if (seatIdAttr) {
                    passengerData.Seat_Id = JSON.parse(seatIdAttr)
                }

                // بررسی و اضافه کردن serviceId در صورت وجود
                const serviceIdAttr = passengerElement.getAttribute("data-serviceId");
                if (serviceIdAttr) {
                    passengerData.ServiceId = JSON.parse(serviceIdAttr)
                }
                passengerList.push(passengerData);
            }
        });

        // Collect buyer data based on account type
        const accountType = document.querySelector(".book-buyers__container").dataset.accounttype;
        const mid = document.querySelector(".book-buyers__container").dataset.mid;
        if (Number(accountType) === 1) {
            if (Number(mid) === 24) {
                const buyerDataContent = document.querySelector(".book-passenger-content");
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
                        buyerDataContent.querySelector(".book-gender").closest(".book-info__item__container"), ".book-data-id"
                    ),
                    countryid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-countryid"),
                    cityid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-cityid"),
                    namecounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-firstname"),
                    familycounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-lastname")
                };
            } else {
                const buyerDataContent = document.querySelector(".book-buyer__agency__content");
                buyerData = {
                    agencyname: getFieldValue(buyerDataContent, ".book-Agencyname"),
                    agencymanegername: getFieldValue(buyerDataContent, ".book-Agencymanegername"),
                    agencytell: getFieldValue(buyerDataContent, ".book-tel__number"),
                    agencymobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
                    agencyaddress: getFieldValue(buyerDataContent, ".book-address"),
                    agencyemail: getFieldValue(buyerDataContent, ".book-email"),
                    agencyweb: getFieldValue(buyerDataContent, ".book-web"),
                    agencyfax: "-",
                    agencyid: getFieldValue(buyerDataContent, ".book-agencyid"),
                    countryid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-countryid"),
                    cityid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-cityid"),
                    namecounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-firstname"),
                    familycounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-lastname")
                };
            }
        } else if (Number(accountType) === 2) {
            const buyerDataContent = document.querySelector(".book-buyer__type__content-2");
            buyerData = {
                agencyname: getFieldValue(buyerDataContent, ".book-Agencyname"),
                agencymanegername: getFieldValue(buyerDataContent, ".book-Agencymanegername"),
                namecounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-firstname"),
                familycounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-lastname"),
                emailcounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-email"),
                mobilecounter: getFieldValue(document.querySelector(".book-check__has__data"), ".book-mobile__number"),
                agencytell: getFieldValue(buyerDataContent, ".book-tel__number"),
                agencymobile: getFieldValue(buyerDataContent, ".book-mobile__number"),
                agencyaddress: getFieldValue(buyerDataContent, ".book-address"),
                agencyemail: getFieldValue(buyerDataContent, ".book-email"),
                agencyweb: getFieldValue(buyerDataContent, ".book-web"),
                agencyfax: "-",
                agencyid: getFieldValue(buyerDataContent, ".book-agencyid"),
                countryid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-countryid"),
                cityid: getFieldValue(document.querySelector(".book-check__has__data"), ".book-cityid"),
            };
        }
        else {
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
                    buyerDataContent.querySelector(".book-gender").closest(".book-info__item__container"),
                    ".book-data-id"
                ),
                countryid: getFieldValue(buyerDataContent, ".book-countryid"),
                cityid: getFieldValue(buyerDataContent, ".book-cityid"),
            };
        }

        // Create form data
        const formData = {
            SessionId: sessionSearchStorage.SessionId,
            FlightId: sessionBookStorage.FlightId,
            FlightGroup: sessionBookStorage.FlightGroup,
            SchemaId: sessionSearchStorage.SchemaId,
            Travelers: passengerList,
            account: buyerData,
            agencycountername: document.querySelector(".book-counter__container").querySelector(".book-name").value,
            agencycounter: document.querySelector(".book-counter__container").querySelector(".book-name").dataset.id,
            clear: document.querySelector(".book-clear").value,
            payType: document.querySelector(".book-payType").value,
            bankIdentifier: document.querySelector(".book-bankIdentifier").value,
            accounttype: document.querySelector(".book-buyers__container").dataset.accounttype,
            mid: document.querySelector(".book-buyers__container").dataset.mid,
            code: document.querySelector(".book-coupon__code").value,
            club_discount: "",
            invoicedesc: document.querySelector(".book-invoicedesc").value,
            engine: (
                (utmSource === "safarmarket" || (safarmarketIdCookie && domainId.includes("4869")))
                    ? 2
                    : ""
            )

        };

        // Create and submit form
        const form = document.createElement("form");
        form.method = "POST";
        form.action = `/book/final`;
        for (const key in formData) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = typeof formData[key] === "object" ? JSON.stringify(formData[key]) : formData[key];
            form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
    } catch (error) {
        console.error("sendDataWithFetch: " + error.message);
    }
}

/**
 * Closes a modal container if the click is outside its content.
 * @param {HTMLElement} element - The modal container element.
 */
const closeModalContainer = (element, forceCloseClass = null, event = window.event) => {
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

    } catch (error) {
        console.error("closeModalContainer: " + error.message);
    }
};

/**
 * Navigates to the next booking step (passenger, buyer, or summary) with validation.
 * @param {HTMLElement} element - The element triggering the step transition (e.g., next button).
 */
const nextStep = (element) => {
    // try {
    const step = element.getAttribute("data-step");

    if (step === "passenger") {
        // Validate passenger information
        let isExist = true;
        let isValid = true;
        const passengerInfoContents = document.querySelectorAll(".book-passenger__container");

        // Check required fields and dates for each passenger
        passengerInfoContents.forEach(passengerContent => {
            if (!passengerContent.closest(".book-passengers__content").classList.contains("book-hidden")) {
                const numberItems = passengerContent.querySelectorAll(".book-info__item__container");
                numberItems.forEach(e => {
                    // Remove existing error messages
                    const description = e.querySelector(".book-alert__content");
                    if (description) description.remove();

                    // Validate required fields
                    const necessaryField = e.querySelector(".book-Required");
                    if (necessaryField) {
                        const innerItem = necessaryField.closest(".book-info__item__content");
                        innerItem.classList.remove("book-invalid");
                        if (necessaryField.value === "") {
                            innerItem.classList.add("book-invalid");
                            e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("passenger_info_required")}</div>`);
                            isExist = false;
                        }
                    }

                    // Validate date fields
                    const dateItems = e.querySelectorAll(".book-date__item__content");
                    dateItems.forEach(dateItem => {
                        const dateNecessaryField = dateItem.querySelector(".book-Required");
                        if (dateNecessaryField) {
                            const dateInnerItem = dateNecessaryField.closest(".book-info__item__content");
                            dateInnerItem.classList.remove("book-invalid");
                            if (dateNecessaryField.value === "" ||
                                (!dateNecessaryField.getAttribute("data-id") || dateNecessaryField.getAttribute("data-id") === "")) {
                                dateInnerItem.classList.add("book-invalid");
                                if (!e.querySelector(".book-alert__content")) {
                                    e.insertAdjacentHTML('beforeend', `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("passenger_info_required")}</div>`);
                                }
                                isExist = false;
                            }
                        }
                    });
                });
            }
        });

        if (isExist) {
            // Validate dates and passenger types
            const exitDateMsDate = new Date(lastDepartureDate);
            const passengerContents = document.querySelectorAll(".book-passenger__container");

            passengerContents.forEach(passengerContent => {
                if (!passengerContent.closest(".book-passengers__content").classList.contains("book-hidden")) {
                    const passengerType = passengerContent.querySelector(".book-Type").value;
                    const birthdayField = passengerContent.querySelector(".book-DateOfBirth");
                    birthdayField.value = checkDate(birthdayField.value);
                    let birthday = birthdayField.value;
                    const birthParts = birthday.split('-');
                    // Validate birth date
                    const [checkYear, checkMonth, checkDay] = birthParts.map(part => parseInt(part, 10));
                    const birthdayDate = new Date(birthday);
                    if (isNaN(checkYear) || isNaN(checkMonth) || isNaN(checkDay) ||
                        checkMonth < 1 || checkMonth > 12 ||
                        checkDay < 1 || checkDay > new Date(checkYear, checkMonth, 0).getDate() ||
                        isNaN(birthdayDate.getTime())) {
                        addDateError(`${translate("valid_date_required")}`, birthdayField);
                        isValid = false;
                    } else {
                        removeDateError(birthdayField);

                        // Calculate age
                        const cmsDate = document.querySelector("main").dataset.cmsdate;
                        const formattedDate = cmsDate
                            .split("/")
                            .map(part => part.padStart(2, "0"))
                            .join("-");
                        const [MM, DD, YYYY] = formattedDate.split("-");
                        const finalDate = `${YYYY}-${MM}-${DD}`;
                        const currentDate = new Date(finalDate);
                        const daysDiff = Math.ceil((currentDate - birthdayDate) / (1000 * 3600 * 24));
                        const age = Math.floor(daysDiff / 365);

                        // Validate age based on passenger type
                        if (passengerType === "ADT" && (age < 12 || age > 98)) {
                            addDateError(`${translate("valid_adult_birth_date")}`, birthdayField);
                            isValid = false;
                        } else if (passengerType === "CHD" && (age < 2 || age > 12)) {
                            addDateError(`${translate("valid_child_birth_date")}`, birthdayField);
                            isValid = false;
                        } else if (passengerType === "INF" && (age < 0 || age > 2)) {
                            addDateError(`${translate("valid_infant_birth_date")}`, birthdayField);
                            isValid = false;
                        } else {
                            removeDateError(birthdayField);
                        }
                    }

                    // Validate passport expiration
                    const passExpireField = passengerContent.querySelector(".book-PassportExpiration");
                    if (passExpireField && passExpireField.closest(".book-info__item__container").querySelector(".book-day").classList.contains("book-Required")) {
                        passExpireField.value = checkDate(passExpireField.value);
                        let passExpireDate = passExpireField.value;
                        const passExpireParts = passExpireDate.split('-');
                        // Convert Jalali to Gregorian if needed
                        const year = parseInt(passExpireParts[0], 10);
                        const month = parseInt(passExpireParts[1], 10);
                        const day = parseInt(passExpireParts[2], 10);
                        const passExpireDateObject = new Date(passExpireDate);
                        // Validate passport date
                        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(passExpireDateObject.getTime()) ||
                            month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) {
                            addDateError(`${translate("valid_date_required")}`, passExpireField);
                            isValid = false;
                        } else {
                            // Check 6-month validity
                            const timeDiff = passExpireDateObject.getTime() - exitDateMsDate.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                            if (daysDiff < 183) {
                                addDateError(`${translate("passport_expiration_six_month")}`, passExpireField);
                                isValid = false;
                            } else {
                                removeDateError(passExpireField);
                            }
                        }
                    }

                    // Validate passport code
                    const passportCodeField = passengerContent.querySelector(".book-PassportCode");
                    if (passportCodeField && passportCodeField.classList.contains("book-Required")) {
                        const passportCode = passportCodeField.value;
                        const regex = /^[a-zA-Z]{1}[0-9]{8}$/;
                        const placeOfBirth = passengerContent.querySelector(".book-PlaceOfBirth");
                        if (placeOfBirth && placeOfBirth.value === "1002236") {
                            if (!regex.test(passportCode)) {
                                addError(passportCodeField, `${translate("invalid_passport_number")}`);
                                isValid = false;
                            } else {
                                removeError(passportCodeField);
                            }
                        }
                    }

                    // Validate national code
                    const nationalCodeField = passengerContent.querySelector(".book-NationalCode");
                    if (nationalCodeField && nationalCodeField.classList.contains("book-Required")) {
                        const placeOfBirth = passengerContent.querySelector(".book-PlaceOfBirth");
                        if (placeOfBirth && placeOfBirth.value === "1002236") {
                            const nationalCode = nationalCodeField.value;
                            let checkArray = 0;
                            for (let i = 0; i < 10; i++) {
                                if (nationalCode[0] === nationalCode[i]) {
                                    checkArray++;
                                }
                            }
                            if (checkArray < 10) {
                                const check = parseFloat(nationalCode[9]);
                                let sum = 0;
                                for (let i = 0; i < 9; i++) {
                                    sum += parseFloat(nationalCode[i]) * (10 - i);
                                }
                                sum %= 11;
                                if ((sum < 2 && check === sum) || (sum >= 2 && check + sum === 11)) {
                                    removeError(nationalCodeField);
                                } else {
                                    addError(nationalCodeField, `${translate("invalid_national_code")}`);
                                    isValid = false;
                                }
                            } else {
                                addError(nationalCodeField, `${translate("invalid_national_code")}`);
                                isValid = false;
                            }
                        }
                    }

                    // Validate English fields
                    passengerContent.querySelectorAll(".book-EnglishKey").forEach(englishField => {
                        if (englishField.classList.contains("book-Required")) {
                            if (englishField.value.length < 2) {
                                addError(englishField, `${translate("minimum_character_2")}`);
                                isValid = false;
                            } else {
                                const regex = /^[a-zA-Z ]+$/;
                                if (!regex.test(englishField.value)) {
                                    addError(englishField, `${translate("invalid_english_character")}`);
                                    isValid = false;
                                } else {
                                    removeError(englishField);
                                }
                            }
                        }
                    });

                    // Validate country fields
                    passengerContent.querySelectorAll(".book-NameOfCountry").forEach(countryField => {
                        if (countryField.classList.contains("book-Required")) {
                            if (countryField.getAttribute("data-value") === '') {
                                countryField.closest(".book-info__item__content").classList.add("book-invalid");
                                countryField.closest(".book-info__item__container").insertAdjacentHTML('beforeend',
                                    `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("select_country")}</div>`);
                                isValid = false;
                            } else {
                                countryField.closest(".book-info__item__content").classList.remove("book-invalid");
                                countryField.closest(".book-info__item__container").querySelectorAll(".book-alert__content").forEach(desc => desc.remove());
                            }
                        }
                    });
                }
            });

            if (isValid) {
                // Transition to buyer step or login
                const mainUserId = document.querySelector(".main-userid").value;
                if (mainUserId === "0") {
                    showLoginContainer();
                } else {
                    document.querySelector(".book-passengers__container").classList.add("book-hidden");
                    const buyersContainer = document.querySelector(".book-buyers__container");
                    buyersContainer.classList.remove("book-hidden");
                    document.querySelector(".book-current__route__map").innerText = `${translate("buyer_info")}`;
                    element.setAttribute("data-step", "buyer");
                    const prevSibling = element.previousElementSibling;
                    if (prevSibling) {
                        prevSibling.classList.remove("book-hidden");
                        prevSibling.setAttribute("data-step", "buyer");
                    }
                    updateStepItems("buyer");
                    if (buyersContainer.getAttribute("data-run") === "0") {
                        $bc.setSource("cms.buyer", true);
                        buyersContainer.setAttribute("data-run", "1");
                    }
                }
            }
        }
    } else if (step === "buyer") {
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
    } else if (step === "summary") {
        // Validate summary step
        let isValid = true;
        const removeDescription = (container) => {
            const description = container.querySelector(".book-alert__content");
            if (description) description.remove();
        };

        // Validate company rules checkbox
        const ruleContent = document.querySelector(".book-company__rule__container");
        removeDescription(ruleContent);
        if (!ruleContent.querySelector("input[type=checkbox]").checked) {
            ruleContent.insertAdjacentHTML('beforeend',
                `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("accept_rules")}</div>`);
            isValid = false;
        }

        // Validate counter selection
        const counterContent = document.querySelector(".book-counter__container");
        removeDescription(counterContent);
        if (counterContent.classList.contains("book-Required")) {
            const counterName = counterContent.querySelector(".book-name").value;
            if (counterName === "") {
                counterContent.insertAdjacentHTML('beforeend',
                    `<div class="book-alert__content book-text-red-600 book-text-xs book-mt-2">${translate("select_action_counter")}</div>`);
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
                const bankListData = {
                    rkey: rkey,
                    selectedMode: selectedMode,
                    userCreditUrl: userCreditUrl,
                    run: true
                };

                if (utmSource === "safarmarket" || (safarmarketIdCookie && domainId.includes("4869"))) {
                    bankListData.engine = 2;
                }

                $bc.setSource("cms.bankList", [bankListData]);

            }
            /* } */
        }
    }
    // } catch (error) {
    //     console.error("nextStep: " + error.message);
    // }
}
/**
 * Navigates to the previous booking step (buyer to passenger, or summary to buyer) with UI updates.
 * @param {HTMLElement} element - The element triggering the step transition (e.g., previous button).
 */
const prevStep = (element) => {
    try {
        const step = element.getAttribute("data-step");

        if (step === "buyer") {
            // Transition from buyer to passenger step
            toggleVisibility(".book-passengers__container", ".book-buyers__container");
            document.querySelector(".book-current__route__map").innerText = `${translate("passengerInfo")}`;
            element.classList.add("book-hidden");
            updateStep(`${translate("passengerInfo")}`, element);
        } else if (step === "summary") {
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
    } catch (error) {
        console.error("prevStep: " + error.message);
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
