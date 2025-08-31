

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

        let result = `<span>${hours} ${translate("hour")}`;
    if (minutes > 0) {
            result += `<span class="book-mx-1">${translate("and")}</span> ${minutes} ${translate("minute")}`;
    }
        result += `</span>`;
    return result;
  } catch (error) {
        console.error("renderFormatterDuration: " + error.message);
    return str;
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
                const firstPay = parseFloat(document.querySelector(".book-firstpay__cost").textContent.replace(/,/g, ""));
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
        element.closest(".book-aside__content")
            .querySelectorAll(".book-api__container")
            .forEach(e => {
                if (e !== target && !e.querySelector(".book-api__container__content").classList.contains("book-hidden")) {
                    e.querySelector(".book-api__container__content").classList.add("book-hidden");
                }
            });
        toggleContentApi(target.querySelector(".book-content__api"), type, parent, true);
    } catch (error) {
        console.error("scrollModalContainerItem: " + error.message);
    }
};


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

// 90%
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
