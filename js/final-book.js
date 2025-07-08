if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPaymentLogic);
} else {
    runPaymentLogic(); // DOM is already ready
}

function runPaymentLogic() {
    try {
        const { selectedMode, share, accounttype, payType, bankIdentifier, schemaId, sessionId, FlightGroup, email, mobile, fullname } = window.cmsData;
    } catch (error) {
        console.error("DOMContentLoaded: " + error.message);
    }
}

/**
   * Processes booking API response, handles price changes, and initiates ticket issuance or payment.
   * @param {Object} args - API response object containing source data with status, price change, and book ID.
   */
const setReserve = async (args) => {
    try {
        // Validate API response
        const response = args.source?.rows?.[0];
        if (!response || response.Status === undefined) {
            throw new Error("Invalid or missing API response data");
        }

        const responseStatus = response.Status;
        const responseErrorMessage = response.ErrorMessage || "خطایی رخ داده است";
        const responseContainer = document.querySelector(".book-message__booking__container");
        if (!responseContainer) {
            throw new Error("Response container not found");
        }

        const responseFirst = responseContainer.querySelector(".book__first__message__content");
        const responseLast = responseContainer.querySelector(".book__last__message__content");
        if (!responseLast) {
            throw new Error("Last message content element not found");
        }
        const lastMessage = responseLast.querySelector(".book__last__message");
        if (!lastMessage) {
            throw new Error("Last message element not found");
        }

        if (responseStatus === true) {

            const priceChange = response.PriceChange;
            const bookId = response.AirReservation?.BasisFlyBookId;
            if (!bookId) {
                throw new Error("Book ID not found in response");
            }
            // Chack safarmarket api
            if (bankIdentifier === "37") {
                $bc.setSource("cms.safarmarket", [{
                    pnr: bookId,
                    fliNo: FlightGroup[0].RoutesInfo[0].FlightNumber,
                    typ: FlightGroup[0].isSystemFlight === "true" || FlightGroup[0].isSystemFlight === true ? "SYSTEM" : "CHARTER",
                    pri: PriceInfo.PassengerFare[0].Unit,
                    pax: PriceInfo.TotalCommission,
                    adu: PriceInfo.PassengerFare.find(p => p.passengerType === "Adult")?.Count || 0,
                    chi: PriceInfo.PassengerFare.find(p => p.passengerType === "Child")?.Count || 0,
                    inf: PriceInfo.PassengerFare.find(p => p.passengerType === "Infant")?.Count || 0,
                    from: FlightGroup[0].RoutesInfo[0].OriginAirport,
                    to: FlightGroup[0].RoutesInfo[0].DestinationAirport,
                    dep: `${FlightGroup[0].RoutesInfo[0].DepartureDate} ${FlightGroup[0].RoutesInfo[0].DepartureTime}`,
                    ret: FlightGroup.length > 1 ? `${FlightGroup[1].RoutesInfo[0].DepartureDate} ${FlightGroup[1].RoutesInfo[0].DepartureTime}` : "",
                    nam: fullname,
                    pho: mobile,
                    ema: email,
                    rFTyp: FlightGroup[1] ? (FlightGroup[1].isSystemFlight === "true" || FlightGroup[1].isSystemFlight === true ? "SYSTEM" : "CHARTER") : "",
                    rPnr: bookId,
                    rFliNo: FlightGroup[1] && FlightGroup[1].RoutesInfo && FlightGroup[1].RoutesInfo[0] ? FlightGroup[1].RoutesInfo[0].FlightNumber : "",
                    run: true
                }]);



            };
            if (priceChange === null) {
                // No price change, proceed with booking
                confirmBookingProcesse(bookId);
            } else {
                // Display price change confirmation UI
                if (responseFirst) {
                    responseFirst.classList.add("book-hidden");
                }
                responseLast.classList.remove("book-hidden");
                lastMessage.innerHTML = `
                    <div class="book-price__changed">تغییر قیمت اتفاق افتاده ,مایل به ادامه فرآیند رزرو با مبلغ 
                    ${new Intl.NumberFormat().format(priceChange)} هستید؟</div>
                    <button class="book-mx-2 book-bg-green-600 book-mt-4 book-text-white  book-rounded-lg book-p-2 book-min-w-28" onclick="confirmBookingProcesse('${bookId}')">بله, ادامه میدم</button>
                    <button class="book-mx-2 book-bg-red-500 book-mt-4 book-text-white  book-rounded-lg book-p-2 book-min-w-28" onclick="rejectBookingProcesse()">خیر, منصرف شدم</button>`;
            }
        } else {
            // Display error message
            if (responseFirst) {
                responseFirst.classList.add("book-hidden");
            }
            responseLast.classList.remove("book-hidden");
            lastMessage.textContent = responseErrorMessage;
        }
    } catch (err) {
        console.error(`setReserve: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};
/**
 * Confirms price change or booking and triggers ticket issuance or payment gateway.
 * @param {string} bookId - The booking ID for ticket issuance.
 */
const confirmBookingProcesse = async (bookId) => {
    try {
        // Validate DOM elements
        const responseContainer = document.querySelector(".book-message__booking__container");
        if (!responseContainer) {
            throw new Error("Response container not found");
        }
        const responseFirst = responseContainer.querySelector(".book__first__message__content");
        const responseLast = responseContainer.querySelector(".book__last__message__content");
        if (!responseLast) {
            throw new Error("Last message content element not found");
        }
        const lastMessage = responseLast.querySelector(".book__last__message");
        if (!lastMessage) {
            throw new Error("Last message element not found");
        }


        if (!accounttype || !bankIdentifier) {
            throw new Error("Missing required templating placeholders");
        }
        if (Number(accounttype) === 1) {
            console.log('Account type 1: Processing contract');
            if (responseFirst) {
                responseFirst.classList.add("book-hidden");
            }
            responseLast.classList.remove("book-hidden");
            // Note: responseErrorMessage is undefined here; assuming it's a global or passed variable
            lastMessage.innerHTML = `پیش رزرو شما با موفقیت انجام شد`;
        } else {
            console.log('Account type not 1: Checking payment type');
            const issueTicketPayload = {
                bookId: bookId,
                run: true
            };
            if (selectedMode === "flight") {
                issueTicketPayload.url = "https://api.basisfly.com/v2/api/flight/IssueTicket";
            };
            if (payType === 'credit') {
                console.log('Payment type credit: Issuing ticket');
                if (responseFirst) {
                    responseFirst.classList.add("book-hidden");
                }
                responseLast.classList.remove("book-hidden");
                lastMessage.innerHTML = `<div class="book-final__loader"></div><div>در حال صدور رزرو...</div>`;
                $bc.setSource("cms.issueTicket", [issueTicketPayload]);
            } else {
                if (Number(share) === 1) {
                    console.log('Payment type share: Issuing ticket');
                    if (responseFirst) {
                        responseFirst.classList.add("book-hidden");
                    }
                    responseLast.classList.remove("book-hidden");
                    lastMessage.innerHTML = `<div class="book-final__loader"></div><div>در حال صدور رزرو...</div>`;
                    $bc.setSource("cms.issueTicket", [issueTicketPayload]);
                } else {
                    console.log('Payment type not credit: Checking bank identifier');
                    if (bankIdentifier === '-1') {
                        console.log('Bank identifier -1: Displaying contract');
                        if (responseFirst) {
                            responseFirst.classList.add("book-hidden");
                        }
                        responseLast.classList.remove("book-hidden");
                        lastMessage.innerHTML = `پیش رزرو شما با موفقیت انجام شد`;
                    } else {
                        console.log('Bank identifier not -1: Initiating payment');
                        if (!account) {
                            throw new Error("Invalid account data format");
                        }

                        $bc.setSource("cms.token", [{
                            bookId: bookId,
                            accountEmail: email,
                            accountMobile: mobile,
                            run: true
                        }]);
                    }
                }
            }
        }
    } catch (err) {
        console.error(`confirmBookingProcesse: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Rejects price change or booking and redirects to the homepage.
 */
const rejectBookingProcesse = async () => {
    try {
        window.location.href = '/';
    } catch (err) {
        console.error(`rejectBookingProcesse: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};
/**
    * Processes ticket issuance API response and updates UI with status or error message.
    * @param {Object} args - API response object containing source data with status and error message.
    */
const setIssueTicket = async (args) => {
    try {
        // Validate API response
        const response = args.source?.rows?.[0];
        const responseStatus = response.Status;
        if (!response || response.Status === undefined) {
            throw new Error("Invalid or missing API response data");
        }

        // Validate DOM elements
        const responseContainer = document.querySelector(".book-message__booking__container");
        if (!responseContainer) {
            throw new Error("Response container not found");
        }
        const responseLast = responseContainer.querySelector(".book__last__message__content");
        if (!responseLast) {
            throw new Error("Last message content element not found");
        }
        const lastMessage = responseLast.querySelector(".book__last__message");
        if (!lastMessage) {
            throw new Error("Last message element not found");
        }
        // Display error message
        if (responseStatus === true) {
            lastMessage.textContent = `رزرو شما با موفقیت انجام شد`;
        } else {
            lastMessage.textContent = response.ErrorMessage || "خطایی رخ داده است";
        }


    } catch (err) {
        console.error(`setIssueTicket: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

/**
 * Processes payment gateway token API response and initiates payment form submission or redirect.
 * @param {Object} args - API response object containing source data with URL, method, and form.
 */
const setToken = async (args) => {
    try {
        // Validate DOM elements
        const responseContainer = document.querySelector(".book-message__booking__container");
        if (!responseContainer) {
            throw new Error("Response container not found");
        }
        const responseLast = responseContainer.querySelector(".book__last__message__content");
        if (!responseLast) {
            throw new Error("Last message content element not found");
        }
        const lastMessage = responseLast.querySelector(".book__last__message");
        if (!lastMessage) {
            throw new Error("Last message element not found");
        }

        // Validate API response
        const source = args.source?.rows;
        if (!source || !source[0]) {
            throw new Error("Source data not found");
        }


        if (!bankIdentifier || !payType || !schemaId || !sessionId) {
            throw new Error("Missing required templating placeholders");
        }

        // Get bookId from DOM
        const layoutMain = document.querySelector(".book-layout__main");
        const bookId = layoutMain?.dataset.id;
        if (!bookId) {
            throw new Error("Book ID not found in DOM dataset");
        }

        if (source[0].url_gateway) {
            // Initiate payment gateway request
            const safarmarketURL = bankIdentifier === "37"
                ? `https://safarmarket.com/api/v1/trace/pixel/${providerName}/3/` +
                `?smId=[##cms.cookie.safarmarketId##]` +
                `&pnr=${encodeURIComponent(bookId)}` +
                `&fliNo=${encodeURIComponent(FlightGroup[0].RoutesInfo[0].FlightNumber)}` +
                `&typ=${encodeURIComponent(
                    FlightGroup[0].isSystemFlight === "true" || FlightGroup[0].isSystemFlight === true
                        ? "SYSTEM" : "CHARTER"
                )}` +
                `&pri=${encodeURIComponent(PriceInfo.PassengerFare[0].Unit)}` +
                `&pax=${encodeURIComponent(PriceInfo.TotalCommission)}` +
                `&adu=${encodeURIComponent(
                    PriceInfo.PassengerFare.find(p => p.passengerType === "Adult")?.Count || 0
                )}` +
                `&chi=${encodeURIComponent(
                    PriceInfo.PassengerFare.find(p => p.passengerType === "Child")?.Count || 0
                )}` +
                `&inf=${encodeURIComponent(
                    PriceInfo.PassengerFare.find(p => p.passengerType === "Infant")?.Count || 0
                )}` +
                `&from=${encodeURIComponent(FlightGroup[0].RoutesInfo[0].OriginAirport)}` +
                `&to=${encodeURIComponent(FlightGroup[0].RoutesInfo[0].DestinationAirport)}` +
                `&dep=${encodeURIComponent(
                    `${FlightGroup[0].RoutesInfo[0].DepartureDate} ${FlightGroup[0].RoutesInfo[0].DepartureTime}`
                )}` +
                `&ret=${encodeURIComponent(
                    FlightGroup.length > 1
                        ? `${FlightGroup[1].RoutesInfo[0].DepartureDate} ${FlightGroup[1].RoutesInfo[0].DepartureTime}`
                        : ""
                )}` +
                `&nam=${encodeURIComponent(fullname)}` +
                `&pho=${encodeURIComponent(mobile)}` +
                `&ema=${encodeURIComponent(email)}` +
                `&rFTyp=${encodeURIComponent(
                    FlightGroup[1]
                        ? (FlightGroup[1].isSystemFlight === "true" || FlightGroup[1].isSystemFlight === true
                            ? "SYSTEM" : "CHARTER")
                        : ""
                )}` +
                `&rPnr=${encodeURIComponent(bookId)}` +
                `&rFliNo=${encodeURIComponent(
                    FlightGroup[1]?.RoutesInfo?.[0]?.FlightNumber || ""
                )}` +
                `&bck=false`
                : "";

            const response = await fetch("/book/saveInput", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    bankIdentifier,
                    payType,
                    schemaid: schemaId,
                    sessionId,
                    bookId,
                    session: source[0].session,
                    orderid: source[0].orderid,
                    selectedMode: selectedMode,
                    safarmarketURL

                })
            });
            const result = await response.text();

            if (source[0].method === 'POST') {
                // Submit payment form
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = source[0].form;
                const form = tempDiv.querySelector('form');
                if (!form) {
                    throw new Error("Payment form not found");
                }
                document.body.appendChild(form);
                form.submit();
            } else {
                // Redirect to gateway URL
                window.location = source[0].url_gateway;
            }
            if (document.querySelector(".book-price__changed")) {
                lastMessage.insertAdjacentHTML("beforeend", `<div class="book__final__message__content book-my-10"><div class="book-final__loader book-mx-auto book-mb-10"></div><div>در حال اتصال به درگاه بانک...</div></div>`);
            }
        } else {
            // Display error if no gateway URL
            lastMessage.textContent = 'امکان اتصال به درگاه پرداخت الکترونیک وجود ندارد.';
        }
    } catch (err) {
        console.error(`setToken: ${err.message}, Line: ${err.lineNumber || 'unknown'}`);
    }
};

