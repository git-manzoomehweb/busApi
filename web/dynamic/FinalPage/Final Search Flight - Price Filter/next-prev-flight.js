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
                $bc.setSource("cms.bankList", [{
                    engine: utmSource === "safarmarket" ? "2" : "",
                    rkey: rkey,
                    selectedMode: selectedMode,
                    userCreditUrl: userCreditUrl,
                    run: true
                }]);

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