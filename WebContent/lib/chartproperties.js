/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @fileoverview Chart properties for specific chart types
 * @requires zcust.lib.common
 * @version 0.3
 * @todo remove deprecated
 */
jQuery.sap.require("zcust.lib.common");
jQuery.sap.declare("zcust.lib.chartproperties");
zcust.lib.chartproperties = {};

/**
 * conditionally use old api
 * @see zcust.lib.chartproperties.byVizType
 */
if (zcust.lib.common.versionCompare(sap.ui.getCore().getLoadedLibraries()["sap.viz"].version, "1.26.3") >= 0) {
    // use new api
    zcust.lib.chartproperties._oChartMetadata = sap.viz.api.metadata.Viz.get();
    zcust.lib.chartproperties._filterFunc = function(filterItem) {
        return function(el) {
            return el.type === filterItem
        };
    };
} else {
    // use old api
    zcust.lib.chartproperties._oChartMetadata = sap.viz.api.manifest.Viz.get();
    zcust.lib.chartproperties._filterFunc = function(filterItem) {
        return function(el) {
            return el.id === filterItem
        };
    };
}

/*
 * @name chartdata
 * Create data descriptions which used by sap.viz.ui5.controls.VizFrame
 * as aggregation of sap.suite.ui.commons.ChartContainer
 *
 * @constructor
 * @param dataset DatasetDescription
 * @param dataset.dimensions Array of Strings which measures to use in feeds/dataset
 * @param dataset.measures Array of Strings which dimensions to use in feeds/dataset
 * @param dataset.charts Array of vizTypes for which vizTypes create vizFrame data structures;
 *     the order of elements sets the order of charts
 * @param dataset.title {String} VizFrame title
 *
 * @return data structure that describe vizFrame input
 */
/* @todo merge
 *     {icon, title, vizType, setting, dimensions, measures, feeds, path, vizProperties}
 *
 * @todo check compatibility with old libraries
 */
zcust.lib.chartproperties.chartdata = function(dataset) {
    /**
     * @name _genDataset
     * @private
     *
     * @param dataset {DatasetDescription}
     * @param d {Integer} Number of dimensions
     * @param m {Integer} Number of measures
     * @param path {String} Path to dataset
     */
    function _genDataset(x) {
        var dimensions = [],
            j = 0;
        for (var i in dataset.dimensions) {
            dimensions.push({
                axis: 1,
                name: dataset.dimensions[i],
                value: dataset.dimensions[i]
            });
            if (typeof x !== "undefined" && +i >= x.d-1) {
                break;
            }
            j++;
        }

        var measures = [],
            j = 0;
        for (var i in dataset.measures) {
            measures.push({
                name: dataset.measures[i],
                value: dataset.measures[i]
            });
            if (typeof x !== "undefined" && +i >= x.m-1) {
                break;
            }
            j++;
        }

        return {
            dimensions: dimensions,
            measures: measures,
            path: dataset.path
        };
    };

    // Dimensions
    var _feedAxisLabels = {
        uid: "axisLabels",
        type: "Dimension",
        values: dataset.dimensions
    };

    var _feedPrimaryValues = {
        uid: "primaryValues",
        type: "Measure",
        values: dataset.measures
    };

    var resDataset = _genDataset();

    var vizProperties = {};
    if (typeof dataset.vizProperties !== "undefined") {
        vizProperties = dataset.vizProperties;
    }
    this._vizProperties = function() {
        return vizProperties;
    }.bind(this);

    if (typeof dataset.title !== "undefined") {
        this._vizProperties = function() {
            vizProperties.title = {
                visible: true,
                text: dataset.title,
            };
            return vizProperties;
        }.bind(this);
    }

    if (typeof dataset.titles !== "undefined") {
        this._vizProperties = function(sVizType) {
            var lVizProperties = JSON.parse(JSON.stringify(vizProperties));
            lVizProperties.title = {
                visible: true,
                text: dataset.titles[dataset.charts.indexOf(sVizType)],
            };
            return lVizProperties;
        }.bind(this);
    }

    return {
        dimensions: resDataset.dimensions,
        measures: resDataset.measures,
        feeds: [_feedPrimaryValues, _feedAxisLabels]
    };
};

/**
 * @name updateFeeds
 * only for sap.viz.ui5.controls.VizFrame in aChartContainerContent
 *
 * @param [sap.viz.ui5.controls.VizFrame] aChartContainerContent
 * @param [ INDID: String, selected: bool ] aData array of objects represented measure names and if it selected to show on chart or not
 * @param {sap.ui.model.json.JSONModel} oChartsDescriptionModel model that contains raw feeds
 * @param {String} sFeedType "Measure" or "Dimension"
 * @param {string} sDimensionMeasure INDID in DetailReport, undefined in tepaup
 */
zcust.lib.chartproperties.updateFeeds = function(aChartContainerContent, aData, oChartsDescriptionModel, sFeedType, sMainMeasure, sDimensionMeasure) {
    var aVizFrames = aChartContainerContent
        .map(function(el) {
            return el.getContent();
        })
        // update feeds for charts and not table
        .filter(function(el) {
            return el.getMetadata()._sClassName === "sap.viz.ui5.controls.VizFrame";
    });

    // @todo one raw feed for both charts
    for (var i = 0; i < aVizFrames.length; i++) {
        var iIndexInVizFrameFeeds = aVizFrames[i].getFeeds()
            .map(function(el) {
                return el.getType();
            })
            .indexOf(sFeedType);
        var iIndexInRawFeeds = oChartsDescriptionModel.getProperty(
            "/" + i + "/rawFeeds"
        ).map(function(el) {
            return el.type
        }).indexOf(sFeedType);

        // ensure to get copy of raw feeds not link
        var oRawPrimaryValuesFeed = JSON.parse(
            JSON.stringify(
                oChartsDescriptionModel.getProperty(
                    "/" + i + "/rawFeeds/" + iIndexInRawFeeds
                )
            )
        );

        if (sDimensionMeasure) {

            // add or remove measures from feeds
            for (var j in aData) {
                var sMeasure = aData[j][sDimensionMeasure];

                if (aData[j].selected) {
                    // add
                    // ensure that sMeasure not in oRawPrimaryValuesFeed
                    if (oRawPrimaryValuesFeed.values.indexOf(sMeasure) === -1) {
                        oRawPrimaryValuesFeed.values = oRawPrimaryValuesFeed.values
                            .concat(sMeasure);
                    }
                } else {
                    // remove
                    // ensure that sMeasure in oRawPrimaryValuesFeed
                    if (oRawPrimaryValuesFeed.values.indexOf(sMeasure) !== -1) {
                        oRawPrimaryValuesFeed.values.splice(
                            oRawPrimaryValuesFeed.values.indexOf(sMeasure),
                            1
                        );
                    }
                }
            }

        } else {
            oRawPrimaryValuesFeed.values = aData;
        }

        // sorting for legend
        oRawPrimaryValuesFeed.values.sort();

        // remove main measure and insert it in the beginning of measures
        var index = oRawPrimaryValuesFeed.values.indexOf(sMainMeasure);
        if (index > -1) {
            oRawPrimaryValuesFeed.values.splice(index, 1);
            oRawPrimaryValuesFeed.values = [sMainMeasure].concat(oRawPrimaryValuesFeed.values);
        }

        // ensure to write copy of raw feeds (not link) for future needs
        oChartsDescriptionModel.setProperty(
            "/" + i + "/rawFeeds/" + iIndexInRawFeeds,
            JSON.parse(JSON.stringify(oRawPrimaryValuesFeed))
        );

        // update feeds
        aVizFrames[i].removeFeed(iIndexInVizFrameFeeds);
        aVizFrames[i].addFeed(
            new sap.viz.ui5.controls.common.feeds.FeedItem(
                oRawPrimaryValuesFeed
            )
        );
    };
};
