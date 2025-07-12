// تابع اصلی busManipulation برای اتوبوس - بدون نیاز به formatBusData جداگانه
const busManipulation = async (args) => {
    // مقداردهی اولیه متغیرهای صفحه‌بندی و به‌روزرسانی UI
    let currentIndex = 0;
    let start = 0;
    let end = 30;
    let dynamicBusProposalsCount = 0;
    elseExecuted = false;
    startProgressBar();

    /**
     * مدیریت صفحه‌بندی، فیلترگذاری و مرتب‌سازی بر اساس شناسه منبع
     */
    if (args.source.id === 'cms.page') {
        // مقداردهی اولیه وضعیت صفحه‌بندی
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedBusId = null;

        const currentValue = parseInt(args.source.rows[0].value);
        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const pagingContainer = document.querySelector(".book-paging__cards__container");

        // به‌روزرسانی استایل صفحه فعال
        const activeButton = document.querySelector(".book-active__paging");
        activeButton.classList.remove("book-active__paging");
        activeButton.classList.add("bg-white");
        const newActive = pagingContainer.querySelector(`[bc-value="${currentValue}"]`);
        newActive.classList.add("book-active__paging");
        newActive.classList.remove("bg-white");

        // محاسبه محدوده صفحه‌بندی
        start = currentValue * 30;
        end = start + 30;

        // تغییر وضعیت نمایش دکمه قبلی
        prevButton.classList.toggle("book-hidden", currentValue === 0);

        // تغییر وضعیت نمایش دکمه بعدی
        const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
        const lastButton = allButtons[allButtons.length - 1];
        nextButton.classList.toggle("book-hidden", newActive === lastButton);
    } 
    else if (args.source.id === 'cms.nextpage') {
        // مدیریت ناوبری صفحه بعدی
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedBusId = null;

        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const activeButton = document.querySelector(".book-active__paging");
        const currentValue = parseInt(activeButton.getAttribute("bc-value"));
        const nextValue = currentValue + 1;
        const nextPage = document.querySelector(`.book-paging__cards__container [bc-value="${nextValue}"]`);

        if (nextPage) {
            // به‌روزرسانی استایل صفحه فعال
            activeButton.classList.remove("book-active__paging");
            activeButton.classList.add("bg-white");
            nextPage.classList.add("book-active__paging");
            nextPage.classList.remove("bg-white");

            // نمایش صفحه بعدی در صورت مخفی بودن
            if (nextPage.classList.contains("book-hidden")) {
                nextPage.classList.remove("book-hidden");
                const firstVisible = document.querySelector(".book-paging__container:not(.hidden):not(.book-prevpage):not(.book-nextpage)");
                if (firstVisible) firstVisible.classList.add("book-hidden");
            }

            // نمایش دکمه قبلی در صورت عدم قرارگیری در صفحه اول
            prevButton.classList.toggle("book-hidden", nextValue === 0);
        }

        // تغییر وضعیت نمایش دکمه بعدی
        const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
        const lastButton = allButtons[allButtons.length - 1];
        nextButton.classList.toggle("book-hidden", nextPage === lastButton);

        // به‌روزرسانی محدوده صفحه‌بندی
        start = nextValue * 30;
        end = start + 30;
    } 
    else if (args.source.id === 'cms.prevpage') {
        // مدیریت ناوبری صفحه قبلی
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedBusId = null;

        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const activeButton = document.querySelector(".book-active__paging");
        const currentValue = parseInt(activeButton.getAttribute("bc-value"));
        const prevValue = currentValue - 1;
        const prevPage = document.querySelector(`.book-paging__cards__container [bc-value="${prevValue}"]`);

        if (prevPage) {
            // به‌روزرسانی استایل صفحه فعال
            activeButton.classList.remove("book-active__paging");
            activeButton.classList.add("bg-white");
            prevPage.classList.add("book-active__paging");
            prevPage.classList.remove("bg-white");

            // نمایش صفحه قبلی در صورت مخفی بودن
            if (prevPage.classList.contains("book-hidden")) {
                prevPage.classList.remove("book-hidden");
                const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
                const lastVisible = allButtons.reverse().find(btn => !btn.classList.contains("book-hidden"));
                if (lastVisible) lastVisible.classList.add("book-hidden");
            }

            // تغییر وضعیت نمایش دکمه‌های قبلی و بعدی
            prevButton.classList.toggle("book-hidden", prevValue === 0);
            nextButton.classList.remove("book-hidden");
        }

        // به‌روزرسانی محدوده صفحه‌بندی
        start = prevValue * 30;
        end = start + 30;
    } 
    else if (args.source.id === "cms.carrier") {
        // مدیریت فیلتر شرکت حمل‌ونقل
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const value = args.source.rows[0].value;
        const index = carrierNames.indexOf(value);
        if (index !== -1) {
            carrierNames.splice(index, 1);
            toggleFilterCheckbox(".book-carrier__content", value, false);
        } else {
            carrierNames.push(value);
            toggleFilterCheckbox(".book-carrier__content", value, true);
        }
    } 
    else if (args.source.id === "cms.terminal") {
        // مدیریت فیلتر ترمینال
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const value = args.source.rows[0].value;
        const index = terminalNames.indexOf(value);
        if (index !== -1) {
            terminalNames.splice(index, 1);
            toggleFilterCheckbox(".book-terminal__content", value, false);
        } else {
            terminalNames.push(value);
            toggleFilterCheckbox(".book-terminal__content", value, true);
        }
    } 
    else if (args.source.id === "cms.stops") {
        // مدیریت فیلتر تعداد توقف‌ها
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const stopValue = parseInt(args.source.rows[0].value);
        const index = stopNames.indexOf(stopValue);

        if (index !== -1) {
            stopNames.splice(index, 1);
            toggleFilterCheckbox(".book-stops__content", args.source.rows[0].value, false, "");
        } else {
            stopNames.push(stopValue);
            toggleFilterCheckbox(".book-stops__content", args.source.rows[0].value, true, "");
        }
    } 
    else if (args.source.id === "cms.bustype") {
        // مدیریت فیلتر نوع اتوبوس
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const busTypeValue = args.source.rows[0].value.trim();
        if (busTypeValue === "") {
            busTypeNames = [];
            if (isMobile) {
                removeFilterDiv("bus-type");
            }
        } else {
            busTypeNames = busTypeValue
                .split(",")
                .map(item => item.trim().toLowerCase())
                .filter(item => item !== "");
            // این کد برای نسخه موبایل است
            if (isMobile) {
                removeFilterDiv("bus-type");
                addFilterDiv("bus-type", "cms.bustype", busTypeValue);
            }
        }
    } 
    else if (args.source.id === "cms.departuretime") {
        // مدیریت فیلتر زمان حرکت
        InUpdateFiltering = false;
        InUpdatePaging = true;
        const content = document.querySelector(".book-departuretime__content");
        if (!content) return;

        const value = args.source.rows[0].value;
        const selectedEl = content.querySelector(`[bc-value="${value}"]`);
        if (!selectedEl) return;

        const timePeriod = selectedEl.dataset.timePeriod || "";
        const timeRange = selectedEl.dataset.timeRange || "";
        const flexContainer = content.querySelector(".book-times__content");

        const index = departureTimeNames.indexOf(value);
        if (index !== -1) {
            departureTimeNames.splice(index, 1);
            toggleFilterCheckbox(".book-departuretime__content", value, false, "");
            const existingElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
            if (existingElement) existingElement.remove();
            
            // بازگردانی محتوای زمان پیش‌فرض در صورت عدم وجود
            if (!content.querySelector(".book-time__content")) {
                const defaultTimeContent = document.createElement("div");
                defaultTimeContent.className = "book-time__content";
                defaultTimeContent.setAttribute("data-value", "time");
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">صبح</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ساعت از: <span class="book-hour">5:00 تا 11:59</span>
                    </div>
                `;
                content.insertBefore(defaultTimeContent, flexContainer);
            }
        } else {
            departureTimeNames.push(value);
            toggleFilterCheckbox(".book-departuretime__content", value, true, "");
            const existingTimeContents = content.querySelectorAll(".book-time__content");
            
            if (existingTimeContents.length === 1 && departureTimeNames.length === 1) {
                const defaultTimeContent = existingTimeContents[0];
                defaultTimeContent.setAttribute("data-value", value);
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ساعت از: <span class="book-hour">${timeRange}</span>
                    </div>
                `;
            } else {
                const duplicateElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                if (duplicateElement) duplicateElement.remove();

                const newTimeContent = document.createElement("div");
                newTimeContent.className = "book-time__content";
                newTimeContent.setAttribute("data-value", value);
                newTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ساعت از: <span class="book-hour">${timeRange}</span>
                    </div>
                `;
                content.insertBefore(newTimeContent, flexContainer);
            }
        }
    } 
    else if (args.source.id === "cms.price") {
        // مدیریت فیلتر قیمت
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const sliderRect = priceSlider.getBoundingClientRect();

        /**
         * به‌روزرسانی موقعیت اسلایدر قیمت در حرکت ماوس
         * @param {MouseEvent} e - رویداد ماوس
         */
        const onMouseMove = (e) => {
            const x = Math.min(Math.max(e.clientX - sliderRect.left, 0), sliderRect.width);
            const percent = (x / sliderRect.width) * 100;
            if (args.source.rows[0].value === "min" && percent <= maxPercent) {
                minPercent = percent;
            } else if (args.source.rows[0].value === "max" && percent >= minPercent) {
                maxPercent = percent;
            }
            updatePriceSlider();
        };

        /**
         * حذف شنونده‌های رویداد در بالا آمدن ماوس
         */
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    } 
    else if (args.source.id === "cms.duration") {
        // مدیریت فیلتر مدت زمان سفر
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const durationContainer = document.querySelector(".book-duration__content .book-filter__duration__container");
        initializeSlider(
            durationContainer,
            args.source.rows[0].value,
            maxDuration,
            minDuration,
            durationMinValueLabel,
            durationMaxValueLabel,
            durationRange,
            'duration',
            'duration-range'
        );
    } 
    else if (args.source.id === "cms.sort") {
        // مدیریت فیلتر مرتب‌سازی
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = null;
        const sortValue = args.source.rows[0].value;
        const sortItem = document.querySelector(`[bc-value="${sortValue}"]`);
        const sortOrder = sortItem.getAttribute('data-sort');
        const listItems = document.querySelectorAll(".book-sort__cards__container .book-sort__item__content");

        listItems.forEach(item => {
            if (item.getAttribute('data-sort')) {
                item.setAttribute('data-sort', 'descend');
            }
            const svg = item.querySelector('svg');
            if (svg) {
                svg.innerHTML = '<use xlink:href="/booking/images/sprite-booking-icons.svg#sort-up-icon"></use>';
            }
            item.classList.remove('book-sorting__active');
        });

        if (sortValue === "default") {
            currentSort = { value: "default", order: "" };
        } else {
            const newOrder = sortOrder === "ascend" ? "descend" : "ascend";
            sortItem.setAttribute('data-sort', newOrder);
            sortItem.classList.add('book-sorting__active');
            toggleSvg(sortItem.querySelector('svg'), newOrder === "ascend");
            currentSort = { value: sortValue, order: newOrder };
        }
        mustUpdate = true;
    } 
    else if (args.source.id === "cms.bus") {
        // مدیریت انتخاب اتوبوس
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedBusId = args.source.rows[0].value;
    } 
    else if (args.source.id === "bus.search") {
        // مدیریت داده‌های جدید اتوبوس
        newDataCame = true;
        allDataProcessed = false;
    }

    /**
     * به‌روزرسانی UI با پیشنهادات اتوبوس فیلتر شده و مرتب شده
     */
    if (mustUpdate && !InUpdateUIProcess) {
        InUpdateUIProcess = true;

        // جمع‌آوری پیشنهادات جدید اتوبوس و بازنشانی برای جستجوهای جدید
        if (newDataCame) {
            const source = args.context.tryToGetSource("bus.search");
            
            // بازنشانی داده‌ها برای جستجوهای جدید
            if (source.rows[0]?.isNewSearch) {
                allBusProposals = [];
                dictionaries = [];
            }
            
            const existingBusIds = new Set(allBusProposals.map(bus => bus.busId));
            source.rows.forEach(row => {
                if (Array.isArray(row.busProposals)) {
                    const newBuses = row.busProposals.filter(bus => !existingBusIds.has(bus.busId));
                    allBusProposals.push(...newBuses);
                    originalBusProposals = [...allBusProposals];
                    newBuses.forEach(bus => existingBusIds.add(bus.busId));
                }
            });
            
            dictionaries.push(source.rows[source.rows.length - 1].dictionaries);
            newDataCame = false;
            allDataProcessed = true;
        }

        // اعمال مرتب‌سازی در صورت عدم پیش‌فرض بودن و پردازش شدن تمام داده‌ها
        if (allDataProcessed) {
            if (currentSort.value === "default") {
                allBusProposals = [...originalBusProposals];  // برگرد به ترتیب اصلی
            } else {
                allBusProposals.sort((a, b) => {
                    let fieldA, fieldB;
                    if (currentSort.value === "price") {
                        fieldA = a.priceInfo?.totalCommission ? parseFloat(a.priceInfo.totalCommission) : Infinity;
                        fieldB = b.priceInfo?.totalCommission ? parseFloat(b.priceInfo.totalCommission) : Infinity;
                    } else if (currentSort.value === "stops") {
                        fieldA = a.busGroup?.[0]?.numberOfStops || 0;
                        fieldB = b.busGroup?.[0]?.numberOfStops || 0;
                    } else if (currentSort.value === "duration") {
                        fieldA = convertToMinutes(a.busGroup?.[0]?.duration || "");
                        fieldB = convertToMinutes(b.busGroup?.[0]?.duration || "");
                    } else if (currentSort.value === "departure") {
                        fieldA = convertToMinutes(a.busGroup?.[0]?.departureTime || "");
                        fieldB = convertToMinutes(b.busGroup?.[0]?.departureTime || "");
                    }
                    
                    if (fieldA !== undefined && fieldB !== undefined) {
                        return currentSort.order === "ascend" ? fieldA - fieldB : fieldB - fieldA;
                    }
                    return 0;
                });
            }
        }

        // تعریف فیلترها برای پیشنهادات اتوبوس
        const filters = [
            // فیلتر شرکت حمل‌ونقل
            item => !carrierNames.length || item.busGroup.some(bus => 
                bus.routesInfo.some(route => carrierNames.includes(route.busOperatorCode))
            ),
            
            // فیلتر ترمینال
            item => !terminalNames.length || item.busGroup.some(bus => 
                terminalNames.includes(bus.destinationTerminal)
            ),
            
            // فیلتر تعداد توقف‌ها
            item => !stopNames.length || item.busGroup.some(bus => 
                stopNames.includes(parseInt(bus.numberOfStops))
            ),
            
            // فیلتر نوع اتوبوس
            item => !busTypeNames.length || busTypeNames.every(bt => 
                item.busGroup.some(bus => 
                    bus.routesInfo.some(route => 
                        route.busType?.toLowerCase().includes(bt)
                    )
                )
            ),
            
            // فیلتر زمان حرکت
            item => {
                if (!departureTimeNames.length) return true;
                return item.busGroup.some(bus => {
                    const [hour, minute] = bus.departureTime?.split(":")?.map(Number) || [];
                    if (hour == null || minute == null) return false;
                    return departureTimeNames.some(range => {
                        const [start, end] = range.split("-").map(Number);
                        return hour >= start && hour <= end;
                    });
                });
            },
            
            // فیلتر محدوده مدت زمان (در صورت وجود duration)
            item => {
                return item.busGroup.some(bus => {
                    const duration = bus.duration;
                    if (!duration) return true; // رد کردن فیلتر در صورت عدم وجود مدت زمان
                    const durationInMinutes = convertToMinutes(duration);
                    return durationInMinutes >= durationRange[0] && durationInMinutes <= durationRange[1];
                });
            },
            
            // فیلتر قیمت
            item => {
                const price = item.priceInfo?.totalCommission ? parseFloat(item.priceInfo.totalCommission) : Infinity;
                return price >= priceRange[0] && price <= priceRange[1];
            }
        ];

        // فیلتر کردن پیشنهادات اتوبوس
        const newSource = allBusProposals.filter(item => filters.every(filter => filter(item)));

        // به‌روزرسانی نمایش تعداد اتوبوس
        dynamicBusProposalsCount = newSource.length;
        document.querySelector(".book-count__api__content").textContent = dynamicBusProposalsCount;

        // افزودن شاخص و وضعیت انتخاب و فرمت‌دهی داده‌ها
        const locationDict = dictionaries[0]?.location || {};
        const carrierDict = dictionaries[0]?.carriers || {};
        const currencyDict = dictionaries[0]?.currency || {};

        const indexedSource = newSource.map((item, i) => {
            const busGroup = item.busGroup?.[0] || {};
            const routeInfo = busGroup.routesInfo?.[0] || {};
            const price = item.priceInfo?.total || 0;
            const totalCommission = item.priceInfo?.totalCommission || 0;
            const currencyCode = item.priceInfo?.currency || '';
            const originId = busGroup.origin;
            const destinationId = busGroup.destination;
            const carrierCode = routeInfo.busOperatorCode;

            return {
                // داده‌های اصلی
                ...item,
                SelectedBus: item.busId === selectedBusId,
                index: currentIndex + i,
                
                // داده‌های فرمت شده برای نمایش
                rowNumber: i + 1,
                
                // اطلاعات مبدا
                origin: originId,
                originTerminal: busGroup.originTerminal || '',
                originCity: locationDict[originId]?.city || '',
                originCountry: locationDict[originId]?.country || '',
                
                // اطلاعات مقصد
                destination: destinationId,
                destinationTerminal: busGroup.destinationTerminal || '',
                destinationCity: locationDict[destinationId]?.city || '',
                destinationCountry: locationDict[destinationId]?.country || '',
                
                // اطلاعات زمانی
                departureDate: busGroup.departureDate || '',
                departureTime: busGroup.departureTime || '',
                arrivalDate: busGroup.arrivalDate || '',
                arrivalTime: busGroup.arrivalTime || '',
                duration: busGroup.duration || '',
                
                // اطلاعات اتوبوس
                busType: routeInfo.busType || '',
                numberOfStops: busGroup.numberOfStops || 0,
                availableSeats: busGroup.availableSeats || 0,
                
                // اطلاعات بازپرداخت
                refundable: busGroup.refundable || false,
                refundableText: busGroup.refundable ? 'بله' : 'خیر',
                
                // اطلاعات قیمت
                baseFare: item.priceInfo?.baseFare || 0,
                tax: item.priceInfo?.tax || 0,
                providerFare: item.priceInfo?.providerFare || 0,
                price: price,
                totalCommission: totalCommission,
                formattedPrice: formatPrice(price, currencyDict[currencyCode] || ''),
                formattedTotalCommission: formatPrice(totalCommission, currencyDict[currencyCode] || ''),
                currency: currencyDict[currencyCode] || '',
                currencyCode: currencyCode,
                
                // اطلاعات شرکت حمل‌ونقل
                carrierCode: carrierCode,
                carrierName: carrierDict[carrierCode]?.name || '',
                carrierImage: carrierDict[carrierCode]?.image || '',
                
                // اطلاعات ارائه‌دهنده
                providerId: item.Provider?.ProviderId || '',
                dmnid: item.Provider?.Dmnid || '',
                
                // اطلاعات توضیحات
                description: busGroup.description || '',
                
                // اطلاعات مسیر
                segmentId: routeInfo.SegmentId || 1,
                originRoute: routeInfo.originRoute || originId,
                destinationRoute: routeInfo.destinationRoute || destinationId,
            };
        });
        
        currentIndex += newSource.length;

        // مدیریت اسکرول اتوبوس انتخاب شده
        const selectedIndex = indexedSource.findIndex(item => item.SelectedBus);
        if (selectedIndex !== -1) {
            const page = Math.floor(selectedIndex / 30);
            start = page * 30;
            end = start + 30;
            setTimeout(() => {
                const targetElement = document.getElementById(`bus__${selectedIndex}`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        }

        // اعمال صفحه‌بندی
        const pagedSource = indexedSource.slice(start, end);
        BusProposalsSource = pagedSource;

        if (pagedSource.length > 0) {
            // به‌روزرسانی محدوده قیمت با قیمت‌های تجزیه شده
            const pricesSource = allBusProposals.map(item => 
                item.priceInfo?.totalCommission ? parseFloat(item.priceInfo.totalCommission) : null
            ).filter(Boolean);
            
            minPrice = pricesSource.length ? Math.min(...pricesSource) : 0;
            maxPrice = pricesSource.length ? Math.max(...pricesSource) : 0;
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(maxPrice);
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(minPrice);

            // به‌روزرسانی UI صفحه‌بندی
            if (InUpdatePaging) {
                const container = document.querySelector(".book-paging__cards__container");
                const nextPage = container.querySelector(".book-nextpage");
                const prevPage = container.querySelector(".book-prevpage");
                prevPage.classList.add("book-hidden");

                const roundedNumber = Math.ceil(currentIndex / 30);
                const activePage = selectedIndex !== -1 ? Math.floor(selectedIndex / 30) : 0;
                const maxVisiblePages = 5;
                const startPage = Math.max(0, activePage - Math.floor(maxVisiblePages / 2));
                const endPage = Math.min(roundedNumber, startPage + maxVisiblePages);
                const adjustedStartPage = endPage - startPage < maxVisiblePages ? Math.max(0, endPage - maxVisiblePages) : startPage;

                const arrayPaging = Array.from({ length: roundedNumber }, (_, i) => ({
                    index: i,
                    page: i + 1,
                    isActive: i === activePage,
                    isVisible: i >= adjustedStartPage && i < endPage
                }));

                nextPage.classList.toggle("book-hidden", arrayPaging.length <= 1);
                args.context.setAsSource("bus.paging", arrayPaging);
            }

            // به‌روزرسانی فیلترهای اتوبوس
            if (InUpdateFiltering) {
                const filteringSource = allBusProposals;

                // ترکیب دیکشنری‌ها برای شرکت‌ها، ارز و مکان‌ها
                const mergedCarriers = {};
                const mergedCurrency = {};
                const mergedLocation = {};
                dictionaries.forEach(item => {
                    Object.assign(mergedCarriers, item.carriers || {});
                    Object.assign(mergedCurrency, item.currency || {});
                    Object.assign(mergedLocation, item.location || {});
                });

                // بازنشانی لیست‌های شرکت
                let allCarrierItems = [];

                // جمع‌آوری آیتم‌های شرکت با قیمت‌های تجزیه شده
                filteringSource.forEach(item => {
                    const carrierItems = (item.busGroup || []).flatMap(bus =>
                        (bus.routesInfo || []).map(value => ({
                            Name: mergedCarriers[value.busOperatorCode]?.name || "",
                            Logo: mergedCarriers[value.busOperatorCode]?.image || "",
                            Code: value.busOperatorCode || "",
                            NumberOfStops: bus.numberOfStops || 0,
                            BusId: item.busId || "",
                            Price: item.priceInfo?.total ? parseFloat(item.priceInfo.total) : Infinity,
                            Unit: mergedCurrency[item.priceInfo?.currency] || ""
                        }))
                    ).filter(item => item.Name && item.Code && item.Price !== Infinity);

                    allCarrierItems.push(...carrierItems);
                });

                // حذف تکراری شرکت‌ها و انتخاب کمترین قیمت
                const nameToMinPrice = {};
                allCarrierItems.forEach(item => {
                    if (!nameToMinPrice[item.Name] || nameToMinPrice[item.Name].Price > item.Price) {
                        nameToMinPrice[item.Name] = item;
                    }
                });
                const carrierListResult = Object.values(nameToMinPrice).sort((a, b) => a.Price - b.Price);

                args.context.setAsSource("bus.carriers", carrierListResult);

                // فیلتر ترمینال
                const uniqueTerminal = filteringSource.flatMap(item =>
                    (item.busGroup || []).map(bus => ({
                        Name: bus.destinationTerminal || "",
                        Code: bus.destinationTerminal || ""
                    }))
                ).filter(item => item.Name && item.Code);

                const terminalListResult = uniqueTerminal.filter((item, index, self) => 
                    index === self.findIndex(t => t.Name === item.Name)
                );
                args.context.setAsSource("bus.terminals", terminalListResult);

                // فیلتر توقف
                const uniqueStop = filteringSource.flatMap(item =>
                    (item.busGroup || []).map(bus => ({ Name: bus.numberOfStops }))
                ).filter(item => item.Name != null);

                const stopListResult = uniqueStop.filter((item, index, self) => 
                    index === self.findIndex(t => t.Name === item.Name)
                );
                args.context.setAsSource("bus.stops", stopListResult);

                // فیلتر نوع اتوبوس
                const uniqueBusTypes = filteringSource.flatMap(item =>
                    (item.busGroup || []).flatMap(bus =>
                        (bus.routesInfo || []).map(route => ({
                            Name: route.busType || "",
                            Code: route.busType || ""
                        }))
                    )
                ).filter(item => item.Name && item.Code);

                const busTypeListResult = uniqueBusTypes.filter((item, index, self) => 
                    index === self.findIndex(t => t.Name === item.Name)
                );
                args.context.setAsSource("bus.bustypes", busTypeListResult);

                // به‌روزرسانی محدوده‌های مدت زمان (در صورت وجود duration در اتوبوس‌ها)
                const durationsSource = allBusProposals.map(item => 
                    item.busGroup?.[0]?.duration
                ).filter(Boolean);

                if (durationsSource.length > 0) {
                    const uniqueDurationsSource = [...new Set(durationsSource)];
                    const timesInMinutes = uniqueDurationsSource.map(convertToMinutes);
                    minDuration = timesInMinutes.length ? Math.min(...timesInMinutes) : 0;
                    maxDuration = timesInMinutes.length ? Math.max(...timesInMinutes) : 0;
                    durationMaxValueLabel.textContent = convertToTime(maxDuration);
                    durationMinValueLabel.textContent = convertToTime(minDuration);
                }
            } else {
                setTimeout(() => {
                    // checkkkk
                    // setupBookCardButtons();
                }, 0);
            }

            // به‌روزرسانی لیست اتوبوس
            args.context.setAsSource("bus.updated", pagedSource, { keyFieldName: "busId" });
            InUpdateUIProcess = false;
        } else {
            InUpdateUIProcess = false;
            document.querySelector(".book-list__cards__container").innerHTML = `
                <div class="book-text-center">
                    <div>هیچ اتوبوسی مطابق با فیلترهای شما وجود ندارد.</div>
                    <div class="book-text-zinc-900 book-text-xs book-mt-2">برای مشاهده نتایج، فیلترهای خود را پاک کنید.</div>
                </div>
            `;
            const container = document.querySelector(".book-paging__cards__container");
            const buttons = container.querySelectorAll(".book-paging__container:not(.book-nextpage):not(.book-prevpage)");
            const nextPage = container.querySelector(".book-nextpage");
            const prevPage = container.querySelector(".book-prevpage");
            prevPage.classList.add("book-hidden");
            nextPage.classList.add("book-hidden");
            buttons.forEach(button => button.remove());
        }
    }

    // پایان نوار پیشرفت
    endProgressBar();
};

// توابع کمکی مورد نیاز

/**
 * تبدیل زمان به دقیقه
 * @param {string} timeString - رشته زمان (مثل "02:30")
 * @returns {number} - زمان برحسب دقیقه
 */
function convertToMinutes(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 60 + minutes;
}

/**
 * تبدیل دقیقه به فرمت زمان
 * @param {number} minutes - زمان برحسب دقیقه
 * @returns {string} - رشته زمان (مثل "02:30")
 */
function convertToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * فرمت کردن قیمت
 * @param {number} price - قیمت
 * @param {string} currency - واحد پول
 * @returns {string} - قیمت فرمت شده
 */
function formatPrice(price, currency) {
    const formattedNumber = new Intl.NumberFormat('fa-IR').format(price);
    return `${formattedNumber} ${currency}`;
}

/**
 * تنظیم وضعیت چک باکس فیلتر
 * @param {string} containerSelector - سلکتور کانتینر
 * @param {string} value - مقدار
 * @param {boolean} isChecked - وضعیت چک شده
 * @param {string} suffix - پسوند اضافی
 */
function toggleFilterCheckbox(containerSelector, value, isChecked, suffix = "") {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const checkbox = container.querySelector(`[bc-value="${value}"]`);
    if (checkbox) {
        if (isChecked) {
            checkbox.classList.add('book-filter-checked');
        } else {
            checkbox.classList.remove('book-filter-checked');
        }
    }
}

/**
 * مقداردهی اولیه اسلایدر
 * @param {Element} container - عنصر کانتینر
 * @param {string} sliderType - نوع اسلایدر
 * @param {number} maxValue - حداکثر مقدار
 * @param {number} minValue - حداقل مقدار
 * @param {Element} minLabel - برچسب حداقل
 * @param {Element} maxLabel - برچسب حداکثر
 * @param {Array} range - محدوده
 * @param {string} rangeId - شناسه محدوده
 * @param {string} rangeClass - کلاس محدوده
 */
function initializeSlider(container, sliderType, maxValue, minValue, minLabel, maxLabel, range, rangeId, rangeClass) {
    if (!container) return;
    
    // پیاده‌سازی منطق اسلایدر بر اساس نیاز
    console.log(`Initializing slider: ${sliderType}`, {
        maxValue, minValue, range, rangeId, rangeClass
    });
}

/**
 * تغییر SVG بر اساس جهت مرتب‌سازی
 * @param {Element} svgElement - عنصر SVG
 * @param {boolean} isAscending - آیا صعودی است
 */
function toggleSvg(svgElement, isAscending) {
    if (!svgElement) return;
    
    const iconName = isAscending ? 'sort-up-icon' : 'sort-down-icon';
    svgElement.innerHTML = `<use xlink:href="/booking/images/sprite-booking-icons.svg#${iconName}"></use>`;
}

/**
 * راه‌اندازی دکمه‌های کارت رزرو
 */
// function setupBookCardButtons() {
//     const bookButtons = document.querySelectorAll('.book-card-button');
//     bookButtons.forEach(button => {
//         button.addEventListener('click', function() {
//             const busId = this.getAttribute('data-bus-id');
//             if (busId) {
//                 args.context.setAsSource('cms.bus', [{ value: busId }]);
//             }
//         });
//     });
// }

/**
 * شروع نوار پیشرفت
 */
function startProgressBar() {
    const progressBar = document.querySelector('.book-progress-bar');
    if (progressBar) {
        progressBar.style.display = 'block';
    }
}

/**
 * پایان نوار پیشرفت
 */
function endProgressBar() {
    const progressBar = document.querySelector('.book-progress-bar');
    if (progressBar) {
        progressBar.style.display = 'none';
    }
}

/**
 * به‌روزرسانی اسلایدر قیمت
 */
function updatePriceSlider() {
    // پیاده‌سازی منطق به‌روزرسانی اسلایدر قیمت
    const minPriceCalculated = (maxPrice - minPrice) * (minPercent / 100) + minPrice;
    const maxPriceCalculated = (maxPrice - minPrice) * (maxPercent / 100) + minPrice;
    
    priceRange[0] = minPriceCalculated;
    priceRange[1] = maxPriceCalculated;
    
    // به‌روزرسانی نمایش قیمت‌ها
    if (priceMinValueLabel) {
        priceMinValueLabel.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(minPriceCalculated));
    }
    if (priceMaxValueLabel) {
        priceMaxValueLabel.textContent = new Intl.NumberFormat('fa-IR').format(Math.round(maxPriceCalculated));
    }
}

/**
 * افزودن div فیلتر (برای موبایل)
 * @param {string} filterId - شناسه فیلتر
 * @param {string} sourceId - شناسه منبع
 * @param {string} value - مقدار
 */
function addFilterDiv(filterId, sourceId, value) {
    const filterContainer = document.querySelector('.book-mobile-filters');
    if (!filterContainer) return;
    
    const filterDiv = document.createElement('div');
    filterDiv.className = 'book-filter-tag';
    filterDiv.setAttribute('data-filter-id', filterId);
    filterDiv.innerHTML = `
        <span>${value}</span>
        <button onclick="removeFilterDiv('${filterId}')" class="book-filter-remove">×</button>
    `;
    filterContainer.appendChild(filterDiv);
}

/**
 * حذف div فیلتر (برای موبایل)
 * @param {string} filterId - شناسه فیلتر
 */
function removeFilterDiv(filterId) {
    const filterDiv = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (filterDiv) {
        filterDiv.remove();
    }
}