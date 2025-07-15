// Global price-related variables


let activeSchemaId = sessionSearchStorage.SchemaId;
let activeSessionId = sessionSearchStorage.SessionId;
let activeCurrency = sessionBookStorage.PriceInfo?.Currency || sessionBookStorage.priceInfo?.currency;
let activeTotalCommission = sessionBookStorage.PriceInfo?.TotalCommission || sessionBookStorage.priceInfo?.totalCommission;
let activeCommission = sessionBookStorage.PriceInfo?.Commission || (sessionBookStorage.priceInfo?.total - sessionBookStorage.priceInfo?.totalCommission);
let activeTotal = sessionBookStorage.PriceInfo?.Total || sessionBookStorage.priceInfo?.total;
let activeId = sessionBookStorage?.FlightId || sessionBookStorage?.busId;
let activeProviderId = sessionBookStorage.Provider?.ProviderId || 0
/**
 * Switches between passenger and agency buyer types, updating UI and required fields.
 * @param {HTMLElement} e - The element triggering the buyer type switch.
 * @param {string} t - The buyer type ('passenger' or 'agency').
 */
const selectBuyerType = (e, t) => {
    try {
        const buyerInfoContent = e.closest(".book-buyer__info__content");
        const passengerContent = buyerInfoContent.querySelector(".book-buyer__passenger__content");
        const agencyContent = buyerInfoContent.querySelector(".book-buyer__agency__content");
        const typeContent = buyerInfoContent.closest(".book-buyers__container");

        if (t === "passenger") {
            // Activate passenger type
            e.classList.add("book-buyer__type__active");
            if (e.nextElementSibling) {
                e.nextElementSibling.classList.remove("book-buyer__type__active");
            }
            agencyContent.classList.add("book-hidden");
            passengerContent.classList.remove("book-hidden");
            passengerContent.querySelectorAll(".book-info__item__container").forEach(e => e.classList.remove("book-hidden"));

            // Update required fields for passenger inputs
            const inputs = passengerContent.getElementsByTagName("input");
            for (let n = 0; n < inputs.length; n++) {
                const input = inputs[n];
                if (input.getAttribute("type") !== "hidden") {
                    input.classList.add("book-Required");
                    if (input.classList.contains("book-has-dash")) {
                        input.classList.remove("book-Required");
                    }
                }
            }

            // Reset agency fields
            const agencyName = agencyContent.querySelector(".book-name");
            agencyName.classList.remove("book-Required");
            agencyName.value = "";
            const agencyInfo = agencyContent.querySelector(".book-agency__information__content");
            if (agencyInfo) {
                agencyInfo.innerHTML = '';
            }

            // Set mid attribute for passenger type
            typeContent.setAttribute("data-mid", 24);
        } else {
            // Activate agency type
            e.classList.add("book-buyer__type__active");
            if (e.previousElementSibling) {
                e.previousElementSibling.classList.remove("book-buyer__type__active");
            }
            agencyContent.classList.remove("book-hidden");
            passengerContent.classList.add("book-hidden");
            passengerContent.querySelectorAll(".book-info__item__container").forEach(e => e.classList.add("book-hidden"));

            // Update required fields for agency inputs
            const inputs = passengerContent.getElementsByTagName("input");
            for (let n = 0; n < inputs.length; n++) {
                const input = inputs[n];
                if (input.getAttribute("type") !== "hidden" || !input.classList.contains("book-has-dash")) {
                    input.classList.remove("book-Required");
                    input.setAttribute("name", "");
                }
            }

            // Set agency name as required
            agencyContent.querySelector(".book-name").classList.add("book-Required");
            typeContent.setAttribute("data-mid", 18);
        }
    } catch (err) {
        console.error(`selectBuyerType: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Toggles visibility of additional buyer information content.
 * @param {HTMLElement} e - The element triggering the toggle.
 */
const toggleMoreBuyerInfo = (e) => {
    try {
        e.closest(".book-buyer__info__content").querySelector(".book-more__buyer__info__content").classList.toggle("book-hidden");
    } catch (err) {
        console.error(`toggleMoreBuyerInfo: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Marks an input element as changed by setting its data-changed attribute.
 * @param {HTMLElement} element - The input element.
 */
const checkIsChanged = (element) => {
    try {
        element.dataset.changed = 1;
    } catch (err) {
        console.error(`checkIsChanged: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Processes buyer identity information API response and updates email/mobile fields.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedBuyerIdentityInfo = async (args) => {
    try {
        const response = args.response;
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson && !responseJson.errorMessage) {
                if (responseJson.errorid === 1) {
                    console.log('useridentityinfo: ' + responseJson.message);
                } else {
                    // Update email and mobile fields
                    document.querySelectorAll(".book-check__has__data").forEach(ie => {
                        ie.querySelector(".book-email").value = responseJson.emailInfo.email;
                        ie.querySelector(".book-mobile").value = responseJson.mobileInfo.mobile;
                    });
                }
            }
        }
    } catch (err) {
        console.error(`onProcessedBuyerIdentityInfo: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Processes buyer schema API response and updates buyer UI based on account type.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedBuyerSchema = async (args) => {
    try {
        const response = args.response;
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson && !responseJson.errorMessage) {
                const buyersContainer = document.querySelector(".book-buyers__container");
                // Remove loader
                const loader = buyersContainer.querySelector("#ballsWaveG");
                if (loader) loader.remove();
                buyersContainer.setAttribute("data-load", 1);

                // Extract account type and properties
                const accounttype = responseJson.sources[0].data[0].accounttype;
                const properties = responseJson.sources[0].data[0].user_info.sources[0].data[0].properties;
                const typeContent = buyersContainer.querySelector(".book-buyer__type__content");
                typeContent.classList.add(`book-buyer-${accounttype}`);
                buyersContainer.setAttribute("data-accounttype", accounttype);

                // Set mid based on account type
                let mid = 24;
                switch (accounttype) {
                    case 1:
                    case 2:
                    case 3:
                        mid = 24;
                        break;
                }
                buyersContainer.setAttribute("data-mid", mid);

                // Update UI based on account type
                if (accounttype === 3) {
                    // Remove type content for individual buyers
                    const typeContent1 = buyersContainer.querySelector(".book-buyer__type__content-1");
                    const typeContent2 = buyersContainer.querySelector(".book-buyer__type__content-2");
                    if (typeContent1) typeContent1.remove();
                    if (typeContent2) typeContent2.remove();
                } else {
                    // Add counter info header
                    const checkHasData = buyersContainer.querySelector(".book-check__has__data");
                    checkHasData.classList.add("book-counter__info__content");
                    checkHasData.insertAdjacentHTML('afterbegin',
                        `<div class="book-buyer__info__content book-border-slate-600 book-text-sm book-mb-3">اطلاعات کانتر</div>`);

                    if (accounttype === 2) {
                        // Configure agency type
                        const typeContent1 = buyersContainer.querySelector(".book-buyer__type__content-1");
                        if (typeContent1) typeContent1.remove();
                        const typeContent2 = buyersContainer.querySelector(".book-buyer__type__content-2");
                        typeContent2.classList.remove("book-hidden");

                        // Populate agency fields
                        const buyerInformation = responseJson.sources[0].data[0].buyer_information;
                        typeContent2.querySelector(".book-agencyid").value = buyerInformation.id;
                        typeContent2.querySelector(".book-Agencyname").value = buyerInformation.name;
                        typeContent2.querySelector(".book-Agencymanegername").value = buyerInformation.manager;
                        typeContent2.querySelector(".book-email").value = buyerInformation.email;
                        typeContent2.querySelector(".book-tel").value = buyerInformation.phones[0].phone;
                        typeContent2.querySelector(".book-mobile").value = buyerInformation.mobile;
                        typeContent2.querySelector(".book-address").value = buyerInformation.address;
                        typeContent2.querySelector(".book-web").value = buyerInformation.website;
                    } else {
                        // Configure passenger type
                        const typeContent2 = buyersContainer.querySelector(".book-buyer__type__content-2");
                        if (typeContent2) typeContent2.remove();
                        buyersContainer.querySelector(".book-buyer__type__content-1").classList.remove("book-hidden");
                    }
                }

                // Update user properties
                const checkHasData = buyersContainer.querySelector(".book-check__has__data");
                checkHasData.setAttribute("data-hashId", responseJson.sources[0].data[0].user_info.sources[0].data[0].schemaId);
                properties?.forEach(e => {
                    const setField = (selector, value, id, valueId) => {
                        const field = checkHasData.querySelector(selector);
                        field.value = value;
                        field.setAttribute("data-id", id || '');
                        field.setAttribute("data-valueId", valueId || id || '');
                    };

                    if (e.prpId === 1) {
                        setField(".book-firstname", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    } else if (e.prpId === 2) {
                        setField(".book-lastname", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    } else if (e.prpId === 4) {
                        setField(".book-tel", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    } else if (e.prpId === 6) {
                        setField(".book-address", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    } else if (e.prpId === 7) {
                        const genderField = checkHasData.querySelector(".book-gender");
                        const genderDataId = genderField.closest(".book-info__item__container").querySelector(".book-data-id");
                        const genderTrust = checkHasData.querySelector(".book-gender-id-trust");
                        if (e.answers[0].parts[0].values[0].value === 666) {
                            genderTrust.value = 666;
                            genderDataId.value = 0;
                            genderField.value = "خانم";
                        } else {
                            genderTrust.value = 668;
                            genderDataId.value = 1;
                            genderField.value = "آقا";
                        }
                        genderTrust.setAttribute("data-id", e.answers[0].id || '');
                        genderTrust.setAttribute("data-valueId", e.answers[0].parts[0].values[0].id || '');
                    } else if (e.prpId === 8) {
                        setField(".book-birthdate", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    } else if (e.prpId === 9) {
                        setField(".book-codepost", e.answers[0].parts[0].values[0].value, e.answers[0].id, e.answers[0].parts[0].values[0].id);
                    }
                });

                // Set readonly for non-accounttype-3 fields with values
                if (accounttype !== 3) {
                    checkHasData.querySelectorAll("input").forEach(e => {
                        if (e.value.length > 1 && e.getAttribute("data-changed")) {
                            e.readOnly = true;
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.error(`onProcessedBuyerSchema: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};
/**
 * Processes commission API response and updates total costs with commission deduction.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedCommission = async (args) => {
    try {
        const response = args.response;
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson && responseJson.CommissionCost !== 0) {
                // Add commission display
                document.querySelector(".book-totalcom__container").insertAdjacentHTML('beforebegin',
                    `<div class="book-mb-2 book-flex book-justify-between book-commission__container">
                        <div class="book-text-sm book-text-zinc-500">کمیسیون</div>
                        <div>
                            <span class="book-font-bold book-text-lg book-commission__cost">${new Intl.NumberFormat().format(responseJson.CommissionCost)}</span>
                            <span class="book-text-xs book-mr-2">${await renderCurrency(activeCurrency)}</span>
                        </div>
                    </div>`);

                // Update total commercial cost
                const totalComElement = document.querySelector(".book-totalcom__cost");
                if (totalComElement) {
                    let currentTotalCom = parseFloat(totalComElement.textContent) || 0;
                    let newTotalCom = currentTotalCom - responseJson.CommissionCost;
                    totalComElement.textContent = new Intl.NumberFormat().format(newTotalCom);
                }

                // Update first pay cost
                const firstPayElement = document.querySelector(".book-firstpay__cost");
                let currentFirstPay = parseFloat(firstPayElement.textContent) || 0;
                let newFirstPay = currentFirstPay - responseJson.CommissionCost;
                firstPayElement.textContent = new Intl.NumberFormat().format(newFirstPay);
            }
        }
    } catch (err) {
        console.error(`onProcessedCommission: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Processes payment step API response and updates first pay and total costs.
 * @param {Object} args - API response object containing status and data.
 */
const onProcessedPaymentStep = async (args) => {
    try {
        const response = args.response;
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson) {
                // Set global cost variables
                originalTotalCom = activeTotalCommission;
                originalTotal = activeTotal;

                const firstPayElement = document.querySelector(".book-firstpay__cost");
                const firstPayContainer = document.querySelector(".book-firstpay__container");
                const totalComContainer = document.querySelector(".book-totalcom__container");

                if (responseJson.firstpay === 1) {
                    // Full payment case
                    firstPayElement.textContent = new Intl.NumberFormat().format(activeTotalCommission);
                    originalFirstPay = activeTotalCommission;
                } else {
                    // Partial payment case
                    firstPayElement.textContent = new Intl.NumberFormat().format(activeTotalCommission * responseJson.firstpay);
                    firstPayContainer.querySelector(".book-title").textContent = 'پرداخت مرحله اول';
                    totalComContainer.insertAdjacentHTML('beforeend',
                        `<div class="book-text-sm book-title">مبلغ قابل پرداخت</div>
                         <div>
                             <span class="book-font-bold book-text-sm book-totalcom__cost">${new Intl.NumberFormat().format(activeTotalCommission)}</span> 
                             <span class="book-text-xs book-mx-1">${await renderCurrency(activeCurrency)}</span>
                         </div>`);
                    originalFirstPay = activeTotalCommission * responseJson.firstpay;
                }
            }
        }
    } catch (err) {
        console.error(`onProcessedPaymentStep: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};



// This function handles payment logic, including setting sources for commission and payment steps.
const runPaymentLogic = async () => {
    try {
        const {
            requests,
            productGroupField,
            productIdField
        } = getServiceMappingInfo(selectedMode);
        const commissionUrl = requests.commission;
        const paymentStepUrl = requests.paymentStep;
        // If commission is not already calculated (== 0), trigger the commission request
        if (Number(activeCommission) === 0) {
            $bc.setSource("cms.commission", [{
                schemaid: activeSchemaId,            // Schema ID used for identifying service structure
                selectedMode: selectedMode,          // Mode selected by user (e.g., "flight", "bus")
                SessionId: activeSessionId,          // Current session ID
                Id: activeId,                        // Always included — static identifier
                url: commissionUrl,                  // API endpoint for commission, dynamic based on service
                productIdField: productIdField,      // Expose field name to use dynamically in HTML (e.g., "FlightId", "productId")
                run: true                            // Control flag for <basis> engine to execute this
            }]);
        }

        // Always set the source for the payment step request
        $bc.setSource("cms.paymentStep", [{
            SessionId: activeSessionId,             // Session ID for payment step
            selectedMode: selectedMode,             // Selected mode (e.g., "flight", "bus")
            providerId: activeProviderId,           // Provider for the selected product
            productType: 1,                         // Product type (constant for now)
            run: true,                              // Trigger for <basis> execution
            url: paymentStepUrl,                    // API endpoint for payment step
            productGroupField: productGroupField              // Group name for the product, passed statically
        }]);

    } catch (error) {
        // Log the error with message and optional line number
        console.error(`runPaymentLogic: ${error.message}, Line: ${error.lineNumber || 'unknown'}`);
    }
};
/**
 * Initializes commission and payment step API calls if commission is zero.
 */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPaymentLogic);
} else {
    runPaymentLogic(); // DOM is already ready
}

