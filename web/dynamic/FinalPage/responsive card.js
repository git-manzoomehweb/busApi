// last update - for flight
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

// old version - for bus

const busData = JSON.parse(sessionStorage.getItem("sessionBook")) || {};
const busGroup = busData.busGroup || [];

const renderRoutesInfo = async (element) => {
  try {
    // Fetch bus data from localStorage

    const renderBusInfo = (icon, label, value) => {
      if (value && value !== "") {
        return `
                <div class="book-flex book-items-center book-mb-2">
                    <div class="book-w-10 book-h-10 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded book-ml-2">
                        <svg width="25" height="24">
                            <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
                        </svg>
                    </div>
                    <div>
                        <p class="book-text-zinc-500 book-my-2">${label}:</p>
                        <p class="book-text-zinc-900">${value}</p>
                    </div>
                </div>`;
      }
      return "";
    };

    const routeHtml = async (item, index) => {
      // Helper functions to resolve location and carrier details
      // checkk
      const renderLocation = async (locationId) => {
        const location = busData.dictionaries?.location?.[locationId] || {};
        return location.city || "Unknown";
      };

      const renderCarrierName = async (carrierCode) => {
        return busData.dictionaries?.carriers?.[carrierCode]?.name || "Unknown";
      };

      return `
            <div class="book-route__info">
                <div class="book-flex book-mb-4">
                    <div class="book-flex">
                        <div class="book-bus__details__progress__line book-ml-3 book-mr-3 book-relative">
                            <svg width="26" height="40" class="book-absolute book--right-3 book-z-10">
                                <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
                            </svg>
                            <svg width="26" height="40" class="book-absolute book--right-3 book--bottom-3 book-z-10">
                                <use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use>
                            </svg>
                        </div>
                        <div class="book-flex book-flex-col book-justify-between book-border-l book-border-zinc-300 book-px-2 book-ml-3">
                            <div>
                                <h5 class="book-text-xl book-font-bold book-text-zinc-900">${
                                  busGroup[index].originTerminal
                                }</h5>
                                <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${
                                  item.departureTime
                                }</h5>
                                <p class="book-text-zinc-500 book-text-sm book-DepartureDate">${
                                  item.departureDate
                                }</p>
                            </div>
                            <div>
                                <h5 class="book-text-xl book-font-bold book-text-zinc-900">${
                                  busGroup[index].destinationTerminal
                                }</h5>
                                <p class="book-text-zinc-500 book-text-sm">${
                                  item.arrivalDate || ""
                                }</p>
                            </div>
                        </div>
                    </div>
                    <div class="book-flex">
                        <div class="book-flex book-flex-col">
                            <div>
                                <h6 class="book-text-xl book-text-zinc-900">${await renderLocation(
                                  item.originRoute
                                )}</h6>
                                <p class="book-text-zinc-600 book-text-sm book-my-2">
                                    ${await renderLocation(
                                      item.originRoute
                                    )}, ${
        busData.dictionaries?.location?.[item.originRoute]?.country || ""
      }
                                </p>
                                <div ss="book-flex book-items-center book-gap-2">
                                    <span class="book-text-zinc-900 book-text-sm">
                                        ${await renderCarrierName(
                                          item.busOperatorCode
                                        )}
                                    </span>
                                </div>
                            </div>
                            <div class="book-text-sm book-my-5">
                                <div class="">
                                    ${renderBusInfo(
                                      "check-circle-icon",
                                      "نوع اتوبوس",
                                      item.busType
                                    )}
                                    ${renderBusInfo(
                                      "check-circle-icon",
                                      "صندلی‌های موجود",
                                      busGroup[index].availableSeats
                                    )}
                                    ${renderBusInfo(
                                      "check-circle-icon",
                                      "قابلیت استرداد",
                                      busGroup[index].refundable
                                        ? "دارد"
                                        : "ندارد"
                                    )}
                                </div>
                            </div>
                            <div>
                                <h6 class="book-text-xl book-text-zinc-900">${await renderLocation(
                                  item.destinationRoute
                                )}</h6>
                                <p class="book-text-zinc-600 book-text-sm book-my-2">
                                    ${await renderLocation(
                                      item.destinationRoute
                                    )}, ${
        busData.dictionaries?.location?.[item.destinationRoute]?.country || ""
      }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    };

    let output = "";
    for (const bus of busGroup) {
      const routeHtmls = await Promise.all(
        (bus.routesInfo || []).map((item, i) => routeHtml(item, i))
      );
      output += routeHtmls.join("");
    }

    return output;
  } catch (error) {
    console.error("renderRoutesInfo: " + error.message);
    return "";
  }
};