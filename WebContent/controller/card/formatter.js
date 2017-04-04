sap.ui.define(
    [],
    function() {
        "use strict";
        return {
            /**
             * Возвращает цвет для иконки для заданного статуса массовой загрузки маппинг
             */
            getColorForUploadStatus: function(iStatus)
            {
                let color;
                switch (iStatus) {
                    case 0: // ошибка
                        color = "Negative";
                        break;
                    case 1: // ок
                        color = "Positive";
                        break;
                    case 2: // warning
                        color = "#f4c172";
                        break;
                    case 3: // rewrite
                        return "#1600ff";
                }
                return color;
            },


            // /**
            //  * Возвращает иконку для заданного типа карточек (по id)
            //  */
            // getIconForType: function(iTypeID)
            // {
            //     var icon;
            //     switch (iTypeID) {
            //         case 1:
            //         case "1":
            //             icon = "sap-icon://wallet";
            //             break;
            //         case 2:
            //         case "2":
            //             icon = "sap-icon://list";
            //             break;
            //         case 3:
            //         case "3":
            //             icon = "sap-icon://kpi-corporate-performance";
            //             break;
            //         case 4:
            //         case "4":
            //             icon = "sap-icon://provision";
            //             break;
            //         case 5:
            //         case "5":
            //             icon = "sap-icon://overview-chart";
            //             break;
            //         case 6:
            //         case "6":
            //             icon = "sap-icon://form";
            //             break;
            //         default:
            //             icon = "sap-icon://customer-view";
            //             break;
            //     }
            //     return icon;
            // },


            /**
             * Возвращает название класса для заданного статуса
             */
            getClassColorForUploadStatus: function(iStatus)
            {
                switch (iStatus) {
                    case 0:
                        return "ERROR";
                    case 2:
                        return "WARNING";
                    case 3:
                        return "REWRITE";
                    default:
                        return "OK";
                }
            }
        };
    });
