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

        // Build passenger summary with translations
        const passengerParts = [];
        if (adultsCount > 0) passengerParts.push(`${adultsCount} ${translate("passenger_adult")}`);
        if (childrenCount > 0) passengerParts.push(`${childrenCount} ${translate("passenger_child")}`);
        if (infantsCount > 0) passengerParts.push(`${infantsCount} ${translate("passenger_infant")}`);
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
const selectModuleFlightType = (element, schemaId) => {
    try {
        const flightTypes = document.querySelectorAll('.book-module__flight__type li');
        flightTypes.forEach(item => item.classList.remove('book-active__module__flight__type'));
        element.classList.add('book-active__module__flight__type');

        const container = document.querySelector("#route__template");
        const addRouteContainer = document.querySelector(".book__add__roue__container");
        let routeBlocks = container.querySelectorAll(".route-content");

        resetCalendarState();
        clearAllDateInputs(container);

        container.querySelectorAll(".route__name").forEach(e => e.remove());

        if (schemaId === 292) {
            addRouteContainer.classList.remove("book-hidden");

            container.querySelectorAll(".arrival__date__container").forEach(e => {
                e.classList.add("book-hidden", "disabled__date__container");
                const input = e.querySelector(".arrival__date");
                if (input) {
                    input.disabled = true;
                    input.value = '';
                    delete input.dataset.gregorian;
                    delete input.dataset.jalali;
                }
            });

            container.classList.remove("md:book-w-3/5");
            if (!container.classList.contains("book-route__mob")) {
                container.classList.add("book-grid", "book-grid-cols-2", "book-gap-4");
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-11/12"));
            } else {
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-full"));
            }
            container.querySelectorAll(".book-min-w-48").forEach(el => el.classList.remove("book-min-w-48"));

            routeBlocks = container.querySelectorAll(".route-content");
            if (routeBlocks.length < 2) {
                const clone = routeBlocks[0].cloneNode(true);
                clone.querySelectorAll("input").forEach(input => {
                    input.value = '';
                    delete input.dataset.gregorian;
                    delete input.dataset.jalali;
                });
                clone.setAttribute("data-index", routeBlocks.length + 1);
                container.appendChild(clone);
            }

            const firstDepart = container.querySelector('.departure__date');
            if (firstDepart && typeof picker !== 'undefined') {
                currentField = 'depart';
                if (!picker.root.classList.contains('book-hidden')) {
                    picker.open('depart', firstDepart);
                }
            }

            element.closest("form").classList.add("multicity-flight-form");

        } else {
            const isOneWay = (schemaId === 291);

            container.querySelectorAll(".arrival__date__container").forEach(e => {
                e.classList.remove("book-hidden");
                e.classList.toggle("disabled__date__container", isOneWay);
                const input = e.querySelector(".arrival__date");
                if (input) {
                    input.disabled = isOneWay;
                    input.value = '';
                    delete input.dataset.gregorian;
                    delete input.dataset.jalali;
                }
            });

            addRouteContainer.classList.add("book-hidden");
            container.classList.add("md:book-w-3/5");
            if (!container.classList.contains("book-route__mob")) {
                container.classList.remove("book-grid", "book-grid-cols-2", "book-gap-4");
                container.querySelectorAll(".departure__date__container").forEach(e => {
                    e.classList.remove("book-w-11/12", "book-w-full");
                });
            } else {
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.remove("book-w-full"));
            }

            routeBlocks = container.querySelectorAll(".route-content");
            for (let i = 1; i < routeBlocks.length; i++) routeBlocks[i].remove();

            const departInput = container.querySelector('.departure__date');
            if (departInput && typeof picker !== 'undefined') {
                currentField = 'depart';
                if (!picker.root.classList.contains('book-hidden')) {
                    picker.open('depart', departInput);
                }
            }

            element.closest("form").classList.remove("multicity-flight-form");
        }

    } catch (error) {
        console.error("selectModuleFlightType: " + error.message);
    }
};

/**
 * Resets input calendar.
 */
const clearAllDateInputs = (container) => {
    try {
        container.querySelectorAll('.departure__date, .arrival__date').forEach(inp => {
            inp.value = '';
            delete inp.dataset.gregorian;
            delete inp.dataset.jalali;
        });
    } catch (error) {
        console.error("clearAllDateInputs: " + error.message);
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
            loader.innerHTML = `<span class="book-text-zinc-500 book-text-sm">${translate("loading")}</span>`;
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
        const isMobileMode = (typeof isMobile !== "undefined" && isMobile);
        const selector = isMobileMode
            ? ".book-searchedCity__list__container"
            : ".book-suggestedCity__list__container, .book-searchedCity__list__container";

        parent.querySelectorAll(selector).forEach(el => el.remove());
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
        element.value = "";
        element.setAttribute("data-id", "");
        const parent = element.closest(".book-city__option__container");
        let typeid = parent.getAttribute("data-id");
        const existingList = parent.querySelector(".book-suggestedCity__list__container");

        // Toggle existing list
        if (existingList) {
            const wasHidden = existingList.classList.contains("book-hidden");
            existingList.classList.toggle("book-hidden");

            // If it was just opened, always return the most popular cities
            if (wasHidden) {
                if (typeof cachedSuggestedCityHTML !== "undefined" && cachedSuggestedCityHTML) {
                    existingList.innerHTML = cachedSuggestedCityHTML;
                } else {
                    // If no cache, fetch and populate
                    manageCityLoader(parent, "show");
                    const html = await fetchCityList(`/module/retry/suggestedCity?typeid=${typeid}`, parent);
                    manageCityLoader(parent, "hide");
                    if (html) {
                        cachedSuggestedCityHTML = html;
                        existingList.innerHTML = html;
                    }
                }

                // Mobile assignments (label/input)
                if (typeof isMobile !== "undefined" && isMobile) {
                    const labelEl = existingList.querySelector(".book-city__list__label");
                    if (labelEl) {
                        labelEl.textContent = element.classList.contains("departure__location__name")
                            ? "انتخاب مبدا" : "انتخاب مقصد";
                    }
                    const searchInput = existingList.querySelector('.autocomplete__options__container input[oninput^="handleCitySearch"]');
                    if (searchInput) {
                        searchInput.removeAttribute("readonly");
                        searchInput.setAttribute("inputmode", "search");
                        searchInput.value = ""; // Clear every time
                        searchInput.placeholder = element.classList.contains("departure__location__name") ? "مبدا" : "مقصد";
                        setTimeout(() => searchInput.focus(), 0);
                    }
                }
            }
            return;
        }

        // Decide classes based on device
        const containerClasses = (typeof isMobile !== "undefined" && isMobile)
            ? "book-suggestedCity__list__container book-fixed book-inset-x-0 book-top-0 book-bottom-0 book-w-full book-transition book-bg-white book-z-[9999999999]  book-overflow-auto book-overscroll-contain book-h-dvh"
            : "book-suggestedCity__list__container book-max-h-80 book-overflow-auto book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-w-full book-z-10";

        // Use cached HTML if available
        if (cachedSuggestedCityHTML) {
            appendCityList(cachedSuggestedCityHTML, parent, containerClasses);
            const listContainer = parent.querySelector(".book-suggestedCity__list__container");
            initMobileCityListUI(listContainer, element);
            return;
        }

        // Fetch and append new list
        clearCityLists(parent);
        manageCityLoader(parent, "show");
        const html = await fetchCityList(`/module/retry/suggestedCity?typeid=${typeid}`, parent);
        manageCityLoader(parent, "hide");
        if (html) {
            cachedSuggestedCityHTML = html;
            appendCityList(html, parent, containerClasses);
            if (isMobile) {
                const listContainer = parent.querySelector(".book-suggestedCity__list__container");
                initMobileCityListUI(listContainer, element);
            }
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

        const input = container.querySelector(".book-location__name");
        input.value = cityName;
        input.setAttribute("data-id", element.dataset.id || element.querySelector(".id")?.value || "");

        const isDeparture = input.classList.contains("departure__location__name");
        const isArrival = input.classList.contains("arrival__location__name");
        const routeBlock = input.closest(".route-content");
        if (isMobile) {
            const listContainer = container.querySelector(".book-suggestedCity__list__container");
            if (listContainer) listContainer.classList.add("book-hidden");
        }
        if (isDeparture) {
            window.__programmaticClick = true;
            routeBlock?.querySelector(".arrival__location__name")?.click();
            setTimeout(() => (window.__programmaticClick = false), 100);
            const arrivalInput = routeBlock?.querySelector(".arrival__location__name");
            const arrivalInputContainer = arrivalInput.closest(".book-city__option__container");

            if (isMobile && arrivalInput) {
                const anyList = arrivalInputContainer.querySelector(".book-suggestedCity__list__container");
                const labelEl = anyList?.querySelector(".book-city__list__label");
                if (labelEl && !labelEl.textContent.trim()) {
                    labelEl.textContent = "انتخاب مقصد";
                }
                if (!anyList.querySelector("input").placeholder || !anyList.querySelector("input").placeholder.trim()) {
                    anyList.querySelector("input").placeholder = "مقصد";
                }
                anyList.querySelector("input").focus();
            }

        } else if (isArrival) {
            routeBlock?.querySelector(".departure__date")?.click();
        }
    } catch (error) {
        console.error("selectCityItem: " + error.message);
    }
};

/**
 * Helper function to initialize mobile city list UI.
 */
const initMobileCityListUI = (listContainer, triggerInputEl) => {
    const isMobileMode = (typeof isMobile !== "undefined" && isMobile);
    if (!isMobileMode || !listContainer || !triggerInputEl) return;

    // Label
    const labelEl = listContainer.querySelector(".book-city__list__label");
    if (labelEl && !labelEl.textContent.trim()) {
        labelEl.textContent = triggerInputEl.classList.contains("departure__location__name")
            ? "انتخاب مبدا"
            : "انتخاب مقصد";
    }

    // Search input
    const searchInput = listContainer.querySelector('.autocomplete__options__container input[oninput^="handleCitySearch"]');
    if (searchInput) {
        searchInput.removeAttribute("readonly");
        searchInput.setAttribute("inputmode", "search");

        // Placeholder
        if (!searchInput.placeholder || !searchInput.placeholder.trim()) {
            searchInput.placeholder = triggerInputEl.classList.contains("departure__location__name") ? "مبدا" : "مقصد";
        }

        // Focus
        setTimeout(() => searchInput.focus(), 0);
    }
};

/**
 * Confirms and closes the city list.
 */
function confirmAndCloseCityList(btn) {
    try {
        const listContainer = btn.closest(".book-suggestedCity__list__container");
        if (!listContainer) return;

        // Close keyboard and clear search input
        const input = listContainer.querySelector('.autocomplete__options__container input[oninput^="handleCitySearch"]');
        if (input) { input.value = ""; input.setAttribute("readonly", ""); input.blur(); }

        // Reset content to initial version (from cache) and hide panel
        if (typeof cachedSuggestedCityHTML !== "undefined" && cachedSuggestedCityHTML) {
            listContainer.innerHTML = cachedSuggestedCityHTML;
        }
        listContainer.classList.add("book-hidden");
    } catch (e) {
        console.error("confirmAndCloseCityList:", e.message);
    }
}

/**
 * Handles city search with debouncing and fetches results.
 * @param {HTMLElement} element - The input element for city search.
 */

const handleCitySearch = (element) => {
    try {
        const parent = element.closest(".book-city__option__container");
        const isMobileMode = (typeof isMobile !== "undefined" && isMobile);
        const typeid = parent.getAttribute("data-id");
        const query = element.value.trim();

        if (searchTimeout) clearTimeout(searchTimeout);

        // Desktop: Previous behavior
        if (!isMobileMode) {
            clearCityLists(parent);
            if (!query) return;
            searchTimeout = setTimeout(async () => {
                manageCityLoader(parent, "show");
                const html = await fetchCityList(`/module/retry/searchedCity?q=${encodeURIComponent(query)}&typeid=${typeid}`, parent);
                manageCityLoader(parent, "hide");
                if (html) {
                    appendCityList(html, parent,
                        "book-searchedCity__list__container book-max-h-80 book-overflow-auto book-absolute book-top-14 book-left-0 book-bg-white book-shadow-md book-rounded-lg book-p-3 book-w-full book-z-10");
                }
            }, 400);
            return;
        }

        // Mobile: Only update the list content below the input and show loading
        const overlay = parent.querySelector(".book-suggestedCity__list__container");
        if (!overlay) return;

        // If query is empty, remove loading and keep the most popular cities
        if (!query) { mobileSearchLoader(overlay, "hide"); return; }

        const contentEl = overlay.querySelector(".autocomplete__options__container .book-text-sm.book-px-3");
        if (!contentEl) return;

        const searchWrap = contentEl.querySelector(".book-mb-3");
        const keepInput = searchWrap?.querySelector('input[oninput^="handleCitySearch"]') || element;
        const caretPos = keepInput.selectionStart ?? keepInput.value.length;
        const oldPh = keepInput.placeholder;
        const headerTxt = (overlay.querySelector(".book-city__list__label")?.textContent || "").trim();

        searchTimeout = setTimeout(async () => {
            mobileSearchLoader(overlay, "show");           // Show loading
            const html = await fetchCityList(`/module/retry/searchedCity?q=${encodeURIComponent(query)}&typeid=${typeid}`, parent);
            mobileSearchLoader(overlay, "hide");           // Hide loading after response
            if (!html || !searchWrap) return;

            const tmp = document.createElement("div");
            tmp.innerHTML = html;

            const newContent = tmp.querySelector(".autocomplete__options__container .book-text-sm.book-px-3")
                || tmp.querySelector(".book-text-sm.book-px-3")
                || tmp;

            // Clear all items after the current input
            while (searchWrap.nextSibling) searchWrap.nextSibling.remove();

            // Insert only the result list after the input
            const children = Array.from(newContent.children);
            const idx = children.findIndex(n => n.classList?.contains("book-mb-3"));
            const listNodes = (idx >= 0) ? children.slice(idx + 1) : children;
            listNodes.forEach(node => contentEl.appendChild(node.cloneNode(true)));

            // Preserve input and focus
            keepInput.removeAttribute("readonly");
            keepInput.setAttribute("inputmode", "search");
            if (!keepInput.placeholder || !keepInput.placeholder.trim()) {
                keepInput.placeholder = oldPh || (headerTxt.includes("مقصد") ? "مقصد" : "مبدا");
            }
            setTimeout(() => {
                try { keepInput.focus(); keepInput.setSelectionRange(caretPos, caretPos); } catch { }
            }, 0);
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
        const routeBlock = element.closest(".route-content");
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
        const currentRoutes = container.querySelectorAll(".route-content");

        if (currentRoutes.length >= 4) return;

        const clone = currentRoutes[0].cloneNode(true);
        clone.querySelectorAll("input").forEach(input => input.value = "");

        // Add data-index
        clone.setAttribute("data-index", currentRoutes.length + 1);

        // Add delete button for routes 3 and 4 with translation
        if (currentRoutes.length >= 2) {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = translate("delete");
            deleteButton.type = "button";
            deleteButton.classList.add(
                "route__delete",
                "book-bg-red-500",
                "book-text-sm",
                "book-text-white",
                "book-px-2",
                "book-py-1",
                "book-rounded",
                "book-top-0",
                "book-absolute"
            );
            if (currentLanguage === 'fa') {
                if (container.classList.contains("book-route__mob")) {
                    deleteButton.classList.add("book-left-0");
                } else {
                    deleteButton.classList.add("book-left-5");
                }
            }
            else if (currentLanguage === 'en') {
                if (container.classList.contains("book-route__mob")) {
                    deleteButton.classList.add("book-right-0");
                } else {
                    deleteButton.classList.add("book-right-5");
                }
            }
            else if (currentLanguage === 'ar') {
                if (container.classList.contains("book-route__mob")) {
                    deleteButton.classList.add("book-left-0");
                } else {
                    deleteButton.classList.add("book-left-5");
                }
            }
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
        const routes = document.querySelectorAll("#route__template .route-content");
        routes.forEach((route, index) => {
            let nameDiv = route.querySelector(".route__name");
            if (!nameDiv) {
                nameDiv = document.createElement("div");
                nameDiv.classList.add("route__name", "book-text-sm", "book-mb-1");
                route.insertBefore(nameDiv, route.firstChild);
            }
            nameDiv.textContent = tripNames[index];
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
        element.closest(".route-content").remove();
        updateRouteNames();
    } catch (error) {
        console.error("deleteRoute: " + error.message);
    }
};

/* ===== Helpers Convert Date ===== */

const toEnglishDigits = (str) =>
    String(str).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (d) =>
        "0123456789"[
        "۰۱۲۳۴۵۶۷۸۹".indexOf(d) > -1
            ? "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
            : "٠١٢٣٤٥٦٧٨٩".indexOf(d)
        ] ?? d
    );

const _faParts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "numeric", day: "numeric"
});
const _ymdFromDateInPersian = (d) => {
    const parts = _faParts.formatToParts(d);
    const y = +toEnglishDigits(parts.find(p => p.type === "year").value);
    const m = +toEnglishDigits(parts.find(p => p.type === "month").value);
    const da = +toEnglishDigits(parts.find(p => p.type === "day").value);
    return { y, m, d: da };
};
const _cmpYmd = (a, b) => a.y - b.y || a.m - b.m || a.d - b.d;

const jalaliYmdToGregorianDate = (jy, jm, jd) => {
    const DAY = 86400000;
    let low = Date.UTC(jy + 621, 0, 1) - 10 * DAY;
    let high = Date.UTC(jy + 622, 11, 31) + 10 * DAY;
    const target = { y: jy, m: jm, d: jd };
    while (low <= high) {
        const mid = Math.floor(((low + high) / 2) / DAY) * DAY;
        const d = new Date(mid);
        const cur = _ymdFromDateInPersian(d);
        const cmp = _cmpYmd(cur, target);
        if (cmp === 0) return d;
        if (cmp < 0) low = mid + DAY; else high = mid - DAY;
    }
    return null;
};

const convertDateIfPersian = (value) => {
    if (value == null || value === "") return "";

    if (typeof value === "number" || /^\d+$/.test(toEnglishDigits(value))) {
        const n = Number(toEnglishDigits(value));
        const d = new Date(n < 1e12 ? n * 1000 : n);
        if (isNaN(d)) return "";
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
        const da = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${mo}-${da}`;
    }

    let s = toEnglishDigits(String(value)).trim();

    // YYYY-MM-DD
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const y = +m[1], mo = +m[2], da = +m[3];
        if (y < 1700) {
            const g = jalaliYmdToGregorianDate(y, mo, da);
            if (!g) return s;
            const yy = g.getUTCFullYear();
            const mm = String(g.getUTCMonth() + 1).padStart(2, "0");
            const dd = String(g.getUTCDate()).padStart(2, "0");
            return `${yy}-${mm}-${dd}`;
        }
        return s;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(/[zZ]|[+\-]\d{2}:\d{2}$/.test(s) ? s : s + "Z");
        if (isNaN(d)) return "";
        const y = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
        const da = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${mo}-${da}`;
    }

    return s;
};

/* ===== End Helpers ===== */

/**
 * Validates and submits the flight search form, redirecting to the search page.
 * @param {HTMLElement} element - The submit button element.
 */
const fetchApi = (element, moduletype) => {
    try {
        if (moduletype === 'bus') {
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

            const routeBlocks = form.querySelectorAll(".route-content");
            let hasError = false;
            const tripGroup = [];

            routeBlocks.forEach((route, index) => {
                const originInput = route.querySelector(".departure__location__name");
                const destinationInput = route.querySelector(".arrival__location__name");
                const departureDateInput = route.querySelector(".departure__date");

                const origin = originInput?.value.trim();
                const destination = destinationInput?.value.trim();
                const viewValue = departureDateInput?.value.trim();

                if (!origin || !originInput.dataset.id) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("invalid_origin")}.<br>`;
                }
                if (!destination || !destinationInput.dataset.id) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("invalid_destination")}.<br>`;
                }
                if (!viewValue) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("departure_date_required")}.<br>`;
                }
                if (hasError) return;

                const iso = convertDateIfPersian(viewValue);
                tripGroup.push({
                    origin: originInput.dataset.id,
                    destination: destinationInput.dataset.id,
                    originName: extractCityName(origin),
                    destinationName: extractCityName(destination),
                    departureDate: iso
                });
            });

            if (hasError) return;
            errorBox.remove();

            const busSearch = {
                tripGroup,
                rkey: getSearchCookie("rkey") || "",
                dmnid: document.querySelector("main")?.dataset.dmnid || "",
                SchemaId: 391,
                Type: "bus",
                lid: "1"
            };

            sessionStorage.setItem('sessionSearch', JSON.stringify(busSearch));

            window.location.href = '/bus/search';

            return;
        }
        else {
            sessionStorage.removeItem('sessionAmenities')
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

            const routeBlocks = form.querySelectorAll(".route-content");
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

                // Validate inputs with translated error messages
                if (!origin || !originInput.dataset.id) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("invalid_origin")}.<br>`;
                }
                if (!destination || !destinationInput.dataset.id) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("invalid_destination")}.<br>`;
                }
                if (!departureDate) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("departure_date_required")}.<br>`;
                }
                if (returnDateContainer && !returnDateContainer.classList.contains("disabled__date__container") && !returnDate) {
                    hasError = true;
                    errorBox.innerHTML += `${translate("route")} ${index + 1}: ${translate("return_date_required")}.<br>`;
                }

                // Build TripGroup
                if (!hasError) {
                    TripGroup.push({
                        Origin: originInput.dataset.id,
                        Destination: destinationInput.dataset.id,
                        OriginName: extractCityName(origin),
                        DestinationName: extractCityName(destination),
                        DepartureDate: convertDateIfPersian(departureDate)
                    });

                    if (returnDate && returnDateInput && !returnDateInput.disabled) {
                        TripGroup.push({
                            Origin: destinationInput.dataset.id,
                            Destination: originInput.dataset.id,
                            OriginName: extractCityName(destination),
                            DestinationName: extractCityName(origin),
                            DepartureDate: convertDateIfPersian(returnDate)
                        });
                    }
                }
            });
            if (hasError) return;
            // Remove error box if no errors
            errorBox.remove();
            // Build flight search data
            const passengerItems = form.querySelectorAll('.book-passenger__searched__items li');
            const activeEl = document.querySelector(".book-active__module__flight__type");
            const onclickAttr = activeEl.getAttribute("onclick");
            const schemaId = parseInt(onclickAttr.match(/\d+/)[0]);
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
                lid: getLanguageLid()
            };
            sessionStorage.setItem('sessionSearch', JSON.stringify(flightSearch));
            window.location.href = '/flight/search';
        }
    } catch (error) {
        console.error("fetchApi: " + error.message);
    }
};

/**
 * Gets the language ID based on the current language.
 */
const getLanguageLid = () => {
    if (currentLanguage === 'fa') {
        return '1'; // Farsi
    } else if (currentLanguage === 'en') {
        return '2'; // English
    } else if (currentLanguage === 'ar') {
        return '3'; // Arabic
    }
    return '1';
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
        const isOutsideCabin = !event.target.closest(".book-cabinClass__searched__container > div");
        const isOutsidePassenger = !event.target.closest(".book-passenger__searched__container > div");

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
// Loading inside the mobile panel, right below the input
const mobileSearchLoader = (overlay, action = "show") => {
    if (!overlay) return;
    const contentEl = overlay.querySelector(".autocomplete__options__container .book-text-sm.book-px-3");
    if (!contentEl) return;
    const searchWrap = contentEl.querySelector(".book-mb-3"); // Input container
    if (!searchWrap) return;

    let loader = overlay.querySelector(".mobile-search-loader");
    if (action === "show") {
        if (!loader) {
            loader = document.createElement("div");
            loader.className = "mobile-search-loader book-py-3 book-text-center";
            loader.innerHTML = '<span class="book-text-zinc-500 book-text-sm book-inline-block book-animate-pulse-light">در حال بارگذاری...</span>';
            searchWrap.insertAdjacentElement("afterend", loader);
        }
    } else {
        if (loader) loader.remove();
    }
}
