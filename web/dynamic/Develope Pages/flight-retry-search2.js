
/**
* Global state for flight search and passenger management.
*/
const MAX_PER_TYPE = 9; // Maximum passengers per type (adult, child, infant)
const MAX_TOTAL = 9; // Maximum total passengers
let adultsCount = 1; // Number of adult passengers
let childrenCount = 0; // Number of child passengers
let infantsCount = 0; // Number of infant passengers
let cachedSuggestedCityHTML = null; // Cached HTML for suggested city list
let searchTimeout; // Timeout for city search debouncing

/**
* Toggles the cabin class dropdown visibility and arrow icon.
* @param {HTMLElement} element - The element triggering the toggle.
*/
const toggleCabinClassDropdown = (element) => {
    try {
        const container = element.closest('.book-cabinClass__searched__container');
        const dropdown = container.querySelector('.book-cabinClass__searched__items');
        dropdown.classList.toggle('book-hidden');
        toggleArrowIcon(container.querySelector('svg use'));
    } catch (error) {
        console.error("toggleCabinClassDropdown: " + error.message);
    }
};

/**
* Selects a cabin class and updates the UI.
* @param {HTMLElement} element - The selected cabin class element.
*/
const selectCabinClass = (element) => {
    try {
        const container = element.closest('.book-cabinClass__searched__container');
        const span = container.querySelector('.book-cabinClass__searched__content');
        const dropdown = container.querySelector('.book-cabinClass__searched__items');
        span.textContent = element.textContent;
        span.dataset.class = element.dataset.id || "";
        dropdown.classList.add('book-hidden');
        toggleArrowIcon(container.querySelector('svg use'));
    } catch (error) {
        console.error("selectCabinClass: " + error.message);
    }
};

/**
* Updates the passenger UI with current counts and button states.
*/
const updatePassengerUI = () => {
    try {
        const items = document.querySelectorAll('.book-passenger__searched__items li');
        const totalInput = document.querySelector('.book-passenger__count');

        // Build passenger summary
        const passengerParts = [];
        if (adultsCount > 0) passengerParts.push(`${adultsCount} بزرگسال`);
        if (childrenCount > 0) passengerParts.push(`${childrenCount} کودک`);
        if (infantsCount > 0) passengerParts.push(`${infantsCount} نوزاد`);
        totalInput.value = passengerParts.join(' / ');

        // Update each passenger type UI
        items.forEach(li => {
            const type = li.dataset.type;
            const countSpan = li.querySelector('.book-passenger__count__value');
            const plusBtn = li.querySelector('.book-plus');
            const minusBtn = li.querySelector('.book-minus');

            let count, min = 0, max = MAX_PER_TYPE;
            if (type === 'adult') {
                count = adultsCount;
                min = 1;
                max = Math.min(MAX_PER_TYPE, MAX_TOTAL - childrenCount - infantsCount);
            } else if (type === 'child') {
                count = childrenCount;
                max = Math.min(MAX_PER_TYPE, MAX_TOTAL - adultsCount - infantsCount);
            } else if (type === 'infant') {
                count = infantsCount;
                max = Math.min(adultsCount, MAX_PER_TYPE);
            }

            countSpan.textContent = count;
            plusBtn.style.pointerEvents = count >= max ? 'none' : 'auto';
            plusBtn.style.opacity = count >= max ? '0.3' : '1';
            minusBtn.style.pointerEvents = count <= min ? 'none' : 'auto';
            minusBtn.style.opacity = count <= min ? '0.3' : '1';
        });
    } catch (error) {
        console.error("updatePassengerUI: " + error.message);
    }
};

/**
* Increases the passenger count for a specific type and updates the UI.
* @param {HTMLElement} element - The plus button element.
*/
const increasePassengerCount = (element) => {
    try {
        const type = element.closest('li').dataset.type;
        if (type === 'adult' && adultsCount < MAX_PER_TYPE && adultsCount + childrenCount + infantsCount < MAX_TOTAL) {
            adultsCount++;
        } else if (type === 'child' && childrenCount < MAX_PER_TYPE && adultsCount + childrenCount + infantsCount < MAX_TOTAL) {
            childrenCount++;
        } else if (type === 'infant' && infantsCount < MAX_PER_TYPE && infantsCount < adultsCount) {
            infantsCount++;
        }
        updatePassengerUI();
    } catch (error) {
        console.error("increasePassengerCount: " + error.message);
    }
};

/**
* Decreases the passenger count for a specific type and updates the UI.
* @param {HTMLElement} element - The minus button element.
*/
const decreasePassengerCount = (element) => {
    try {
        const type = element.closest('li').dataset.type;
        if (type === 'adult' && adultsCount > 1) {
            adultsCount--;
            if (infantsCount > adultsCount) infantsCount = adultsCount;
        } else if (type === 'child' && childrenCount > 0) {
            childrenCount--;
        } else if (type === 'infant' && infantsCount > 0) {
            infantsCount--;
        }
        updatePassengerUI();
    } catch (error) {
        console.error("decreasePassengerCount: " + error.message);
    }
};

/**
* Selects a flight module type (one-way, round-trip, multi-city) and updates the UI.
* @param {HTMLElement} element - The flight type element.
* @param {number} id - The schema ID (291, 290, 292).
*/
const selectModuleFlightType = (element, id) => {
    try {
        schemaId = id;
        const flightTypes = document.querySelectorAll('.book-module__flight__type li');
        flightTypes.forEach(item => item.classList.remove('book-active__module__flight__type'));
        element.classList.add('book-active__module__flight__type');

        const container = document.querySelector("#route__template");
        const addRouteContainer = document.querySelector(".book__add__roue__container");
        const routeBlocks = container.querySelectorAll(".route__block");

        // Remove existing route names
        container.querySelectorAll(".route__name").forEach(e => e.remove());

        if (schemaId === 292) {
            // Multi-city: Show add route button and adjust styling
            addRouteContainer.classList.remove("book-hidden");
            container.querySelectorAll(".arrival__date__container").forEach(e => {
                e.classList.add("book-hidden");
                e.classList.add("disabled__date__container");
                const input = e.querySelector(".arrival__date");
                if (input) input.disabled = true;
            });
            container.classList.remove("md:book-w-3/5");
            if (!container.classList.contains("book-route__mob")) {
                container.classList.add("book-grid", "book-grid-cols-2", "book-gap-4");
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-11/12"));
            } else {
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-full"));
            }
            const items = container.querySelectorAll(".book-min-w-48");
            if (items.length) {
                items.forEach(el => el.classList.remove("book-min-w-48"));
            }
            // Ensure at least two routes
            if (routeBlocks.length < 2) {
                const clone = routeBlocks[0].cloneNode(true);
                clone.querySelectorAll("input").forEach(input => input.value = "");
                container.appendChild(clone);
            }
        } else {
            // One-way or round-trip: Hide add route button and reset styling
            container.querySelectorAll(".arrival__date__container").forEach(e => {
                e.classList.remove("book-hidden");

                const shouldDisable = schemaId === 291;
                e.classList.toggle("disabled__date__container", shouldDisable);

                const input = e.querySelector(".arrival__date");
                if (input) {
                    input.disabled = shouldDisable;
                    if (!shouldDisable) input.value = "";
                }
            });
            addRouteContainer.classList.add("book-hidden");
            container.classList.add("md:book-w-3/5");
            if (!container.classList.contains("book-route__mob")) {
                container.classList.remove("book-grid", "book-grid-cols-2", "book-gap-4");
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.remove("book-w-11/12"));
            } else {
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.remove("book-w-full"));
            }


            // Remove extra routes
            for (let i = 1; i < routeBlocks.length; i++) {
                routeBlocks[i].remove();
            }
        }
    } catch (error) {
        console.error("selectModuleFlightType: " + error.message);
    }
};

/**
* Shows or hides a city loader spinner.
* @param {HTMLElement} parent - The container for the loader.
* @param {string} [action="show"] - Action to show or hide the loader.
*/
const manageCityLoader = (parent, action = "show") => {
    try {
        let loader = parent.querySelector(".city-loader");
        if (action === "show") {
            if (!loader) {
                loader = document.createElement("div");
                loader.className = "city-loader book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-text-center book-w-full book-z-10";
                parent.appendChild(loader);
            }
            loader.innerHTML = `<span class="book-text-zinc-500 book-text-sm">در حال بارگذاری...</span>`;
        } else if (loader) {
            loader.remove();
        }
    } catch (error) {
        console.error("manageCityLoader: " + error.message);
    }
};

/**
* Fetches a city list from a URL.
* @param {string} url - The URL to fetch the city list from.
* @param {HTMLElement} parent - The container for the loader.
* @returns {string|null} HTML content or null on error.
*/
const fetchCityList = async (url, parent) => {
    try {
        const res = await fetch(url);
        return await res.text();
    } catch (error) {
        console.error("fetchCityList: " + error.message);
        manageCityLoader(parent, "hide");
        return null;
    }
};

/**
* Appends a city list to a parent container.
* @param {string} html - The HTML content to append.
* @param {HTMLElement} parent - The container to append to.
* @param {string} className - The class name for the city list container.
*/
const appendCityList = (html, parent, className) => {
    try {
        if (parent.querySelector(`.${className.split(" ")[0]}`)) return;
        const cityList = document.createElement("div");
        cityList.className = className;
        cityList.innerHTML = html;
        parent.appendChild(cityList);
    } catch (error) {
        console.error("appendCityList: " + error.message);
    }
};

/**
* Clears city list containers from a parent.
* @param {HTMLElement} parent - The container to clear.
*/
const clearCityLists = (parent) => {
    try {
        if (!parent) return;
        parent.querySelectorAll(".book-suggestedCity__list__container, .book-searchedCity__list__container")
            .forEach(el => el.remove());
    } catch (error) {
        console.error("clearCityLists: " + error.message);
    }
};

/**
* Handles click to toggle or fetch the suggested city list.
* @param {HTMLElement} element - The element triggering the city list.
*/
const handleCityListClick = async (element) => {
    try {
        const parent = element.closest(".book-city__option__container");
        const existingList = parent.querySelector(".book-suggestedCity__list__container");

        // Toggle existing list
        if (existingList) {
            existingList.classList.toggle("book-hidden");
            return;
        }

        // Use cached HTML if available
        if (cachedSuggestedCityHTML) {
            appendCityList(cachedSuggestedCityHTML, parent,
                "book-suggestedCity__list__container book-max-h-80 book-overflow-auto book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-w-full book-z-10");
            return;
        }

        // Fetch and append new list
        clearCityLists(parent);
        manageCityLoader(parent, "show");
        const html = await fetchCityList("/module/retry/suggestedCity", parent);
        manageCityLoader(parent, "hide");
        if (html) {
            cachedSuggestedCityHTML = html;
            appendCityList(html, parent,
                "book-suggestedCity__list__container book-max-h-80 book-overflow-auto book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-w-full book-z-10");
        }
    } catch (error) {
        console.error("handleCityListClick: " + error.message);
    }
};

/**
* Selects a city from the list and updates the input field.
* @param {HTMLElement} element - The selected city element.
*/
const selectCityItem = (element) => {
    try {
        const container = element.closest(".book-city__option__container");
        clearCityLists(container);

        const cityName = element.querySelector(".city__option__content")?.textContent || "";
        if (!cityName) return;

        const input = container.querySelector("input");
        input.value = cityName;
        input.setAttribute("data-id", element.dataset.id || element.querySelector(".id")?.value || "");

        const isDeparture = input.classList.contains("departure__location__name");
        const isArrival = input.classList.contains("arrival__location__name");
        const routeBlock = input.closest(".route__block");

        if (isDeparture) {
            window.__programmaticClick = true;
            routeBlock?.querySelector(".arrival__location__name")?.click();
            setTimeout(() => window.__programmaticClick = false, 100);
        } else if (isArrival) {
            routeBlock?.querySelector(".departure__date")?.click();
        }
    } catch (error) {
        console.error("selectCityItem: " + error.message);
    }
};

/**
* Handles city search with debouncing and fetches results.
* @param {HTMLElement} element - The input element for city search.
*/
const handleCitySearch = (element) => {
    try {
        const parent = element.closest(".book-city__option__container");
        clearCityLists(parent);
        const query = element.value.trim();
        if (!query) return;

        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            manageCityLoader(parent, "show");
            const html = await fetchCityList(`/module/retry/searchedCity?q=${encodeURIComponent(query)}`, parent);
            manageCityLoader(parent, "hide");
            if (html) {
                appendCityList(html, parent,
                    "book-searchedCity__list__container book-max-h-80 book-overflow-auto book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-w-full book-z-10");
            }
        }, 400);
    } catch (error) {
        console.error("handleCitySearch: " + error.message);
    }
};

/**
* Exchanges departure and arrival cities in a route block.
* @param {HTMLElement} element - The element triggering the exchange.
*/
const exchangeCities = (element) => {
    try {
        const routeBlock = element.closest(".route__block");
        const departureInput = routeBlock.querySelector(".departure__location__name");
        const arrivalInput = routeBlock.querySelector(".arrival__location__name");

        if (!departureInput || !arrivalInput) return;

        const tempValue = departureInput.value;
        const tempId = departureInput.dataset.id || "";
        departureInput.value = arrivalInput.value;
        departureInput.setAttribute("data-id", arrivalInput.dataset.id || "");
        arrivalInput.value = tempValue;
        arrivalInput.setAttribute("data-id", tempId);
    } catch (error) {
        console.error("exchangeCities: " + error.message);
    }
};

/**
* Adds a new route block for multi-city trips.
*/
const addRoute = () => {
    try {
        const container = document.getElementById("route__template");
        const currentRoutes = container.querySelectorAll(".route__block");

        if (currentRoutes.length >= 4) return;

        const clone = currentRoutes[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(input => input.value = "");

        // Add delete button for routes 3 and 4
        if (currentRoutes.length >= 2) {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "حذف";
            deleteButton.type = "button";
            deleteButton.classList.add("route__delete", "book-bg-red-500", "book-text-sm", "book-text-white", "book-px-2", "book-py-1", "book-rounded", "book-top-0", "book-absolute");
            if (container.classList.contains("book-route__mob")) {
                deleteButton.classList.add("book-left-0");
            } else {
                deleteButton.classList.add("book-left-5");
            };
            deleteButton.onclick = () => deleteRoute(deleteButton);
            clone.appendChild(deleteButton);
        }

        container.appendChild(clone);
        updateRouteNames();
    } catch (error) {
        console.error("addRoute: " + error.message);
    }
};

/**
* Updates route names for multi-city trips.
*/
const updateRouteNames = () => {
    try {
        const routes = document.querySelectorAll("#route__template .route__block");
        routes.forEach((route, index) => {
            let nameDiv = route.querySelector(".route__name");
            if (!nameDiv) {
                nameDiv = document.createElement("div");
                nameDiv.classList.add("route__name", "book-text-sm", "book-mb-1");
                route.insertBefore(nameDiv, route.firstChild);
            }
            nameDiv.textContent = `مسیر ${tripNames[index]}`;
        });
    } catch (error) {
        console.error("updateRouteNames: " + error.message);
    }
};

/**
* Deletes a route block and updates route names.
* @param {HTMLElement} element - The delete button element.
*/
const deleteRoute = (element) => {
    try {
        element.closest(".route__block").remove();
        updateRouteNames();
    } catch (error) {
        console.error("deleteRoute: " + error.message);
    }
};

/**
* Validates and submits the flight search form, redirecting to the search page.
* @param {HTMLElement} element - The submit button element.
*/
const fetchApi = (element) => {
    try {
        const form = element.closest(".book-research__container");
        let errorBox = form.querySelector(".form-error-box");
        if (!errorBox) {
            errorBox = document.createElement("div");
            errorBox.className = "form-error-box";
            errorBox.style.color = "red";
            errorBox.style.marginBottom = "10px";
            form.prepend(errorBox);
        }
        errorBox.innerHTML = "";

        const routeBlocks = form.querySelectorAll(".route__block");
        let hasError = false;
        const TripGroup = [];

        routeBlocks.forEach((route, index) => {
            const originInput = route.querySelector(".departure__location__name");
            const destinationInput = route.querySelector(".arrival__location__name");
            const departureDateInput = route.querySelector(".departure__date");
            const returnDateInput = route.querySelector(".arrival__date");
            const returnDateContainer = route.querySelector(".arrival__date__container");

            const origin = originInput?.value.trim();
            const destination = destinationInput?.value.trim();
            const departureDate = departureDateInput?.value.trim();
            const returnDate = returnDateInput?.value.trim();

            // Validate inputs
            if (!origin || !originInput.dataset.id) {
                hasError = true;
                errorBox.innerHTML += `مسیر ${index + 1}: مبدا نامعتبر است.<br>`;
            }
            if (!destination || !destinationInput.dataset.id) {
                hasError = true;
                errorBox.innerHTML += `مسیر ${index + 1}: مقصد نامعتبر است.<br>`;
            }
            if (!departureDate) {
                hasError = true;
                errorBox.innerHTML += `مسیر ${index + 1}: تاریخ رفت وارد نشده است.<br>`;
            }
            if (returnDateContainer && !returnDateContainer.classList.contains("disabled__date__container") && !returnDate) {
                hasError = true;
                errorBox.innerHTML += `مسیر ${index + 1}: تاریخ برگشت وارد نشده است.<br>`;
            }

            // Build TripGroup
            if (!hasError) {
                TripGroup.push({
                    Origin: originInput.dataset.id,
                    Destination: destinationInput.dataset.id,
                    OriginName: extractCityName(origin),
                    DestinationName: extractCityName(destination),
                    DepartureDate: convertDateIfPersian(
                        departureDateInput.dataset.date || departureDate
                    )
                });

                if (returnDate && returnDateInput && !returnDateInput.disabled) {
                    TripGroup.push({
                        Origin: destinationInput.dataset.id,
                        Destination: originInput.dataset.id,
                        OriginName: extractCityName(destination),
                        DestinationName: extractCityName(origin),
                        DepartureDate: convertDateIfPersian(
                            returnDateInput.dataset.date || returnDate
                        )
                    });
                }
            }
        });

        if (hasError) return;

        // Remove error box if no errors
        errorBox.remove();

        // Build flight search data
        const passengerItems = form.querySelectorAll('.book-passenger__searched__items li');
        const flightSearch = {
            TripGroup,
            CabinClass: form.querySelector(".book-cabinClass__searched__content").dataset.class || "",
            Adults: passengerItems[0]?.querySelector(".book-passenger__count__value")?.textContent || "1",
            Children: passengerItems[1]?.querySelector(".book-passenger__count__value")?.textContent || "0",
            Infants: passengerItems[2]?.querySelector(".book-passenger__count__value")?.textContent || "0",
            rkey: getSearchCookie("rkey") || "",
            dmnid: document.querySelector("main")?.dataset.dmnid || "",
            SchemaId: schemaId || 291,
            Type: "flight",
            lid: "1"
        };

        sessionStorage.setItem('sessionSearch', JSON.stringify(flightSearch));
        window.location.href = '/flight/search';
    } catch (error) {
        console.error("fetchApi: " + error.message);
    }
};

/**
* Retrieves the value of a specific cookie by name.
* @param {string} element - The cookie name.
* @returns {string|null} The cookie value or null if not found.
*/
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

/**
* Extracts the Persian city name from a string.
* @param {string} element - The input string containing the city name.
* @returns {string} The extracted city name or the original string.
*/
const extractCityName = (element) => {
    try {
        const match = element.match(/(?:.*- )?([\u0600-\u06FF]+)(?: -| \(|$)/);
        return match ? match[1].trim() : element;
    } catch (error) {
        console.error("extractCityName: " + error.message);
        return element;
    }
};

/**
* Converts a Persian (Jalali) date to Gregorian format if applicable.
* @param {string} element - The date string (Persian or Gregorian).
* @returns {string} The converted Gregorian date or the original string.
*/
const convertDateIfPersian = (element) => {
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
* Toggles the arrow icon between up and down states.
*/
const toggleArrowIcon = (element) => {
    try {
        if (!element) return;
        const href = element.getAttribute("href") || element.getAttribute("xlink:href") || "";
        const newIcon = href.includes("#down-arrow-icon") ? "up-arrow-icon" : "down-arrow-icon";
        element.setAttribute("href", `/booking/images/sprite-booking-icons.svg#${newIcon}`);
    } catch (error) {
        console.error("toggleArrowIcon: " + error.message);
    }
};
/**
* Converts a Gregorian date to a Persian (Shamsi) date string.
*/
const convertToPersianDate = (element) => {
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
        console.error("convertToPersianDate: " + error.message);
        return "";
    }
};
/**
* Handles click events to close modals and dropdowns when clicking outside.
*/
document.addEventListener('click', (event) => {
    try {
        if (window.__programmaticClick) return;

        // Check if click is outside modal, cabin, passenger, or city elements
        const isOutsideModal = !event.target.closest('.book-modal__content, .book-card__btn, .swiper-slide');
        const isOutsideCabin = !event.target.closest(".book-cabinClass__searched__container > div");
        const isOutsidePassenger = !event.target.closest(".book-passenger__searched__container > div");

        // Close modals
        if (isOutsideModal) {
            document.querySelectorAll('.book-card__container').forEach(card => {
                const modal = card.querySelector('.book-modal__container');
                card.classList.remove('book-card__container__selected');
                modal.classList.add('book--left-full');
                modal.classList.remove('book-left-0');

                // Toggle content visibility and arrows
                card.querySelectorAll(".book-api__container__content").forEach(el => {
                    const isDetails = el.closest(".book-flight__details");
                    const isFareFamily = el.closest(".book-flight__fareFamily");
                    el.classList.toggle("book-hidden", !(isDetails || isFareFamily));
                });

                card.querySelectorAll(".book-api__container__arrow use").forEach(use => {
                    const isDetails = use.closest(".book-flight__details");
                    use.setAttribute("href", `/booking/images/sprite-booking-icons.svg#${isDetails ? 'up' : 'down'}-arrow-icon`);
                });
            });
        }

        // Close cabin dropdown
        if (isOutsideCabin) {
            document.querySelectorAll(".book-cabinClass__searched__items").forEach(el =>
                el.classList.add("book-hidden")
            );
        }

        // Close passenger dropdown
        if (isOutsidePassenger) {
            document.querySelectorAll(".book-passenger__searched__content").forEach(el =>
                el.classList.add("book-hidden")
            );
        }

        // Close city dropdowns
        document.querySelectorAll(".book-city__option__container").forEach(container => {
            if (!container.contains(event.target)) {
                container.querySelectorAll(".book-suggestedCity__list__container, .book-searchedCity__list__container")
                    .forEach(el => el.classList.add("book-hidden"));
            }
        });
    } catch (error) {
        console.error("Click event handler: " + error.message);
    }
});



