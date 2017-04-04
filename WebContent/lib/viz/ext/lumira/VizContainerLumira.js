
jQuery.sap.declare("sap.viz.ext.lumira.VizContainerLumira");
jQuery.sap.require("sap.viz.library");
jQuery.sap.require("sap.viz.ui5.controls.common.BaseControl");

sap.viz.ui5.controls.common.BaseControl.extend("sap.viz.ext.lumira.VizContainerLumira", { metadata : {

    publicMethods : [
        // methods
        "vizUpdate", "vizSelection"
    ],
    library : "sap.viz",
    properties : {
        "vizType" : {type : "string", group : "Misc", defaultValue : null},
        "vizCss" : {type : "string", group : "Misc", defaultValue : null},
        "vizProperties" : {type : "object", group : "Misc", defaultValue : null},
        "enableMorphing" : {type : "boolean", group : "Misc", defaultValue : null},
        "showVizBuilder" : { type : "boolean", group : "Misc", defaultValue : null }
    },
    aggregations : {
        "vizData" : {type : "sap.viz.ui5.data.Dataset", multiple : false},
        "analysisObjectsForPicker" : {type : "sap.viz.ui5.controls.common.feeds.AnalysisObject", multiple : true, singularName : "analysisObjectsForPicker"},
        "feeds" : {type : "sap.viz.ui5.controls.common.feeds.FeedItem", multiple : true, singularName : "feed"}
    },
    events : {
        "feedsChanged" : {},
        "vizTypeChanged" : {},
        "vizDefinitionChanged" : {},
        "selectData" : {},
        "deselectData" : {},
        "showTooltip" : {},
        "hideTooltip" : {},
        "initialized" : {}
    }
}});


/**
 * Creates a new subclass of class sap.viz.ui5.VizContainer with name <code>sClassName</code>
 * and enriches it with the information contained in <code>oClassInfo</code>.
 *
 * <code>oClassInfo</code> might contain the same kind of informations as described in {@link sap.ui.core.Element.extend Element.extend}.
 *
 * @param {string} sClassName name of the class to be created
 * @param {object} [oClassInfo] object literal with informations about the class
 * @param {function} [FNMetaImpl] constructor function for the metadata object. If not given, it defaults to sap.ui.core.ElementMetadata.
 * @return {function} the created class / constructor function
 * @public
 * @static
 * @name sap.viz.ui5.VizContainer.extend
 * @function
 */

sap.viz.ext.lumira.VizContainerLumira.M_EVENTS = {'feedsChanged':'feedsChanged','vizTypeChanged':'vizTypeChanged','vizDefinitionChanged':'vizDefinitionChanged','selectData':'selectData','deselectData':'deselectData','showTooltip':'showTooltip','hideTooltip':'hideTooltip','initialized':'initialized'};



/**
 * Selections for the chart instance of the VizContainer.
 *
 * @name sap.viz.ui5.VizContainer#vizSelection
 * @function
 * @param {object[]} aAPoints
 *         Some data points of the chart
 * @param {object} oOAction
 *         A flag 'clearSelection', whether to clear previous selection, by default the selection will be incremental selection
 * @type object
 * @public
 * @ui5-metamodel This method also will be described in the UI5 (legacy) designtime metamodel
 */

// Start of sap/viz/ui5/VizContainer.js
jQuery.sap.require("sap.viz.libs.sap-viz");
jQuery.sap.require("sap.viz.ui5.container.libs.common.libs.rgbcolor.rgbcolor_static");
jQuery.sap.require("sap.viz.ui5.container.libs.sap-viz-controls-vizcontainer");
jQuery.sap.require("sap.viz.ui5.controls.common.feeds.AnalysisObject");
jQuery.sap.require("sap.viz.ui5.controls.common.feeds.FeedItem");
jQuery.sap.require("sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira");

jQuery.sap.includeStyleSheet(jQuery.sap.getModulePath("sap.viz.ui5.container.libs.css", "/sap.viz.controls.css"));

sap.viz.ext.lumira.VizContainerLumira.prototype.init = function() {
    sap.viz.ui5.controls.common.BaseControl.prototype.init.apply(this,
            arguments);

    this._uiConfig = {
        'layout' : 'horizontal',
        'enableMorphing' : true
    };

    this._vizFrame = null;
    this._vizBuilder = null;
    this._switchBar = null;

    this._vSplitter$ = null;

    this._clearVariables();
};

sap.viz.ext.lumira.VizContainerLumira.prototype.exit = function() {
    sap.viz.ui5.controls.common.BaseControl.prototype.exit.apply(this,
            arguments);

    this._clearVariables();

    this.setVizData(null);
};

sap.viz.ext.lumira.VizContainerLumira.prototype._clearVariables = function() {
    this._vizFrame$ = null;
    this._vizBuilder$ = null;
    this._switchBar$ = null;

    this._clearRequestedProperties();
};
sap.viz.ext.lumira.VizContainerLumira.prototype._clearRequestedProperties = function() {
    this._requestedVizType = 'viz/column';
    this._requestedVizCss = null;
    this._requestedVizProperties = null;

    this._requestedOptions = null;
};

sap.viz.ext.lumira.VizContainerLumira.prototype.setUiConfig = function(
        oUiConfig) {
    this._mergeConfig(oUiConfig);
};

sap.viz.ext.lumira.VizContainerLumira.prototype._mergeConfig = function(oUiConfig) {
    oUiConfig = oUiConfig || {};
    if (oUiConfig.layout === 'vertical' || oUiConfig.layout === 'horizontal') {
        this._uiConfig.layout = oUiConfig.layout;
    }
    this._uiConfig.enableMorphing = oUiConfig.enableMorphing !== false;
};

sap.viz.ext.lumira.VizContainerLumira.prototype.getFeeds = function() {
    var feeds = [];
    if (this._vizFrame && this._vizFrame.feeds()) {
        feeds = sap.viz.ui5.controls.common.feeds.FeedItem
                .toFeeds(this._vizFrame.feeds());
    } else {
        feeds = this.getAggregation('feeds');
    }
    return feeds;
};

sap.viz.ext.lumira.VizContainerLumira.prototype.getVizType = function() {
    if (this._vizFrame) {
        return this._vizFrame.vizType();
    } else {
        return this._requestedVizType;
    }
};
/**
 * Setter for property vizType. A string of supported viz type: viz/column,
 * viz/stacked_column, viz/dual_column, viz/line, viz/area, viz/combination,
 * viz/dual_line, viz/dual_combination, viz/pie, viz/donut, viz/scatter,
 * viz/bubble, viz/heatmap, viz/treemap.
 *
 * @param {string}
 *            sVizType
 * @returns {sap.viz.ui5.VizContainer}
 * @public
 * @function sap.viz.ui5.VizContainer.prototype.setVizType
 */
sap.viz.ext.lumira.VizContainerLumira.prototype.setVizType = function(sVizType) {
    if (this._vizFrame) {
        this._vizFrame.vizType(sVizType);
    } else {
        this._requestedVizType = sVizType;
    }
    return this;
};
sap.viz.ext.lumira.VizContainerLumira.prototype.getVizCss = function() {
    if (this._vizFrame) {
        return this._vizFrame.vizCss();
    } else {
        return this._requestedVizCss;
    }
};
sap.viz.ext.lumira.VizContainerLumira.prototype.setVizCss = function(sVizCss) {
    if (this._vizFrame) {
        this._vizFrame.vizCss(sVizCss);
    } else {
        this._requestedVizCss = sVizCss;
    }
    return this;
};

sap.viz.ext.lumira.VizContainerLumira.prototype.getVizProperties = function() {
    if (this._vizFrame) {
        return this._vizFrame.vizProperties();
    } else {
        return this._requestedVizProperties;
    }
};
/**
 * Properties for visualization. Example:
 *
 * <pre>
 *  var vizContainer = new sap.viz.ui5.VizContainer(...);
 *  var properties = {
 *      'dataLabel' : {'visible' : true },
 *      'legend' : { &quot;visible&quot; : true },
 *      'direction' : 'horizontal',
 *      'stacking' : 'normal'
 * };
 * vizContainer.setVizProperties(properties);
 * </pre>
 *
 * @param {object}
 *            oVizProperties
 * @returns {sap.viz.ui5.VizContainer}
 * @public
 * @function sap.viz.ui5.VizContainer.prototype.setVizProperties
 */
sap.viz.ext.lumira.VizContainerLumira.prototype.setVizProperties = function(oVizProperties) {
    if (this._vizFrame) {
        this._vizFrame.vizProperties(oVizProperties);
    } else {
        this._requestedVizProperties = oVizProperties;
    }
    return this;
};

sap.viz.ext.lumira.VizContainerLumira.prototype.getEnableMorphing = function() {
    if (this._vizFrame) {
        return this._vizFrame.enableMorphing();
    } else {
        return this._uiConfig.enableMorphing;
    }
};
/**
 * Setter for property enableMorphing. If set true, a tween animation will play
 * when chart changed.
 *
 * @param {boolean}
 *            bEnableMorphing
 * @returns {sap.viz.ui5.VizContainer}
 * @public
 * @function sap.viz.ui5.VizContainer.prototype.setEnableMorphing
 */
sap.viz.ext.lumira.VizContainerLumira.prototype.setEnableMorphing = function(bEnableMorphing) {
    if (this._vizFrame) {
        this._vizFrame.enableMorphing(bEnableMorphing);
    } else {
        this._uiConfig.enableMorphing = bEnableMorphing;
    }
    return this;
};
/**
 * Selections for visualization. Example:
 *
 * <pre>
 *  var vizContainer = new sap.viz.ui5.VizContainer(...);
 *  var points = [{
 *      data : {
 *          &quot;Country&quot; : &quot;China&quot;,
 *          &quot;Year&quot; : &quot;2001&quot;,
 *          &quot;Product&quot; : &quot;Car&quot;,
 *          &quot;Profit&quot; : 25
 *      }}, {
 *      data : {
 *          &quot;Country&quot; : &quot;China&quot;,
 *          &quot;Year&quot; : &quot;2001&quot;,
 *          &quot;Product&quot; : &quot;Trunk&quot;,
 *          &quot;Profit&quot; : 34
 *      }}];
 *  var action = {
 *      clearSelection : true
 *  };
 * vizContainer.vizSelection(points, action);
 * </pre>
 *
 * @param {object[]}
 *            aPoints some data points of the chart
 * @param {object}
 *            oAction whether to clear previous selection, by default the
 *            selection will be incremental selection
 * @returns {sap.viz.ui5.VizContainer}
 * @public
 * @function sap.viz.ui5.VizContainer.prototype.vizSelection
 */
sap.viz.ext.lumira.VizContainerLumira.prototype.vizSelection = function(aPoints, oAction) {
    if (this._vizFrame) {
        var result = this._vizFrame.vizSelection.apply(this._vizFrame,
                arguments);
        if (result === this._vizFrame) {
            result = this;
        }
        return result;
    } else {
        return null;
    }
};
/**
 * Update VizContainer according to a JSON object, it can update css,
 * properties, feeds and data model. Example:
 *
 * <pre>
 * var vizContainer = new sap.viz.ui5.VizContainer(...);
 * var vizData = new sap.viz.ui5.data.FlattenedDataset({
 *     'dimensions' : [{
 *         axis: 1,
 *         name: &quot;Country&quot;,
 *         value: &quot;{Country}&quot;
 *         },{
 *         axis: 2,
 *         name: &quot;City&quot;
 *         value: &quot;{City}&quot;
 *      }],
 *      'measures' : [{
 *          group: 1,
 *          name: &quot;Quantity sold&quot;,
 *          value: &quot;{Quantity sold}&quot;
 *       }],
 *       'data' : {
 *           'path' : &quot;/rawData&quot;
 *       }
 * });
 * var cssString = 'position:absolute;left:0px;top:0px;';
 * var properties = {
 *     'dataLabel' : {'visible' : true },
 *     'legend' : {&quot;visible&quot; : true},
 *     'direction' : 'horizontal',
 *     'stacking' : 'normal'
 * };
 * var FeedItem = sap.viz.ui5.controls.common.feeds.FeedItem;
 * var feeds = [
 *     new FeedItem({'uid' : 'primaryValues',
 *                   'type' : 'Measure',
 *                   'values' []}),
 *     new FeedItem({'uid' : 'regionColor',
 *                   'type' : 'Dimension',
 *                   'values' []})];
 * vizContainer.vizUpdate({
 *               'data' : vizData,
 *               'css' : cssString,
 *               'properties' : properties,
 *               'feeds' : feeds
 *           });
 * </pre>
 *
 * @param {object}
 *            oOptions a JSON object contains combination of css, properties,
 *            feeds and data model.
 * @returns {sap.viz.ui5.VizContainer}
 * @public
 * @function sap.viz.ui5.VizContainer.prototype.vizUpdate
 */
sap.viz.ext.lumira.VizContainerLumira.prototype.vizUpdate = function(oOptions) {
    if (this._vizFrame) {
        if (oOptions.data || oOptions.feeds) {
            this._requestedOptions = this._requestedOptions || {};
        }

        if (this._requestedOptions) {
            // Save common keyword in options, release these options when
            // aggregations trigger render
            var requestedOptions = this._requestedOptions;
            requestedOptions.css = requestedOptions.css || oOptions.css;
            requestedOptions.properties = requestedOptions.properties
                    || oOptions.properties;

            if (oOptions.data) {
                this.setVizData(oOptions.data);
            }
            if (oOptions.feeds) {
                this._resetFeeds(oOptions.feeds);
            }
        } else {
            this._vizFrame.vizUpdate(oOptions);
        }
    }
};

sap.viz.ext.lumira.VizContainerLumira.prototype._resetFeeds = function(aFeeds) {
    this.destroyFeeds();

    // update feeds in sequence of aaindexs
    sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira.updateFeedsByAAIndex(
            this.getVizType(), aFeeds);

    if (aFeeds && aFeeds.length) {
        for (var i = 0; i < aFeeds.length; i++) {
            this.addFeed(aFeeds[i]);
        }
    }
    return this;
};
sap.viz.ext.lumira.VizContainerLumira.prototype._setAnalysisObjectsForPicker = function(
        aAnalysisObjects) {
    this.destroyAnalysisObjectsForPicker();
    if (aAnalysisObjects && aAnalysisObjects.length) {
        for (var i = 0; i < aAnalysisObjects.length; i++) {
            this.addAnalysisObjectsForPicker(aAnalysisObjects[i]);
        }
    }
    return this;
};

sap.viz.ext.lumira.VizContainerLumira.prototype._createVizFrame = function(dom) {
    var VizFrame = sap.viz.controls.frame.VizFrame;
    var GlobalConfig = sap.viz.controls.common.config.GlobalConfig;

    var vizFrameConfig = GlobalConfig
            .defaultUIConfig(GlobalConfig.DEFAULT_UICONFIG_TYPE_FRAME);
    vizFrameConfig.enableFilterMenu = false;
    vizFrameConfig.enableFilterBar = false;
    vizFrameConfig.enableSettingButton = false;
    vizFrameConfig.enableFullScreenButton = false;
    vizFrameConfig.controls.chart.enableMorphing = this._uiConfig.enableMorphing;
    vizFrameConfig.controls.chart.enableTrellis = false;
    vizFrameConfig.controls.contextMenu.menu = [ [ "direction", "stacking" ],
            [ "legend", "datalabels" ] ];
    var vizFrame = new VizFrame(dom, vizFrameConfig);

    vizFrame.addEventListener('feedsChanged', jQuery.proxy(function(e) {
        this._resetFeeds(this.getFeeds());
        this.fireEvent("feedsChanged", {
            'feeds' : this.getFeeds()
        });
    }, this));

    vizFrame.addEventListener('vizTypeChanged', jQuery.proxy(function(e) {
        this.fireEvent("vizTypeChanged");
    }, this));

    vizFrame.addEventListener('vizDefinitionChanged', jQuery.proxy(function(e) {
        this.fireEvent("vizDefinitionChanged");
    }, this));

    vizFrame.vizOn('selectData', jQuery.proxy(function(e) {
        this.fireEvent("selectData", e);
    }, this));
    vizFrame.vizOn('deselectData', jQuery.proxy(function(e) {
        this.fireEvent("deselectData", e);
    }, this));
    vizFrame.vizOn('showTooltip', jQuery.proxy(function(e) {
        this.fireEvent("showTooltip", e);
    }, this));
    vizFrame.vizOn('hideTooltip', jQuery.proxy(function(e) {
        this.fireEvent("hideTooltip", e);
    }, this));
    vizFrame.vizOn('initialized', jQuery.proxy(function(e) {
        this.fireEvent("initialized", e);
    }, this));

    var options = vizFrame.getDefaultIncompleteOptions(this.getVizType());

    var feeds = this.getAggregation('feeds');
    if (feeds) {
        options.feeds = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
                .getFeedInstances(feeds);
    }
    var data = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
            .getFakedDataInstance(this.getVizType(), this.getVizData(), feeds);
    if (data) {
        options.data = data;
    }
    if (this.getVizCss()) {
        options.css = this.getVizCss();
    }
    if (this.getVizProperties()) {
        options.properties = this.getVizProperties();
    }
    this._clearRequestedProperties();
    vizFrame.createViz(options);
    return vizFrame;
};
/**
 * Create children views.
 *
 * @private
 */
sap.viz.ext.lumira.VizContainerLumira.prototype._createChildren = function() {
    var app$ = this._app$;
    var cssPrefix = 'ui5-viz-controls';
    var GlobalConfig = sap.viz.controls.common.config.GlobalConfig;

    // VizFrame
    this._vizFrame$ = jQuery(document.createElement('div')).appendTo(app$)
            .addClass(cssPrefix + '-viz-frame');
    this._vizFrame = this._createVizFrame(this._vizFrame$[0]);

    if (this._uiConfig.layout === 'horizontal') {
        // VizBuilder
        var vizBuilderConfig = GlobalConfig
                .defaultUIConfig(GlobalConfig.DEFAULT_UICONFIG_TYPE_BUILDER);
        vizBuilderConfig.controls.feedingPanel.enableTrellis = false;
        vizBuilderConfig.controls.switchBar.groups = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
                .getSwitchBarGroups();

        this._vizBuilder$ = jQuery(document.createElement('div'))
                .appendTo(app$).addClass(cssPrefix + '-viz-builder');
        this._vizBuilder = new sap.viz.controls.builder.VizBuilder(
                this._vizBuilder$[0], vizBuilderConfig);
        this._vizBuilder.connect(this._vizFrame.vizUid());
        // Splitter
        this._vSplitter$ = jQuery(document.createElement('div')).appendTo(app$)
                .addClass(cssPrefix + '-vertical-splitter');
    } else if (this._uiConfig.layout === 'vertical') {
        // SwitchBar
        var switchBarConfig = GlobalConfig
                .defaultUIConfig(GlobalConfig.DEFAULT_UICONFIG_TYPE_SWITCHBAR);
        switchBarConfig.groups = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
                .getSwitchBarGroups();

        this._switchBar$ = jQuery(document.createElement('div')).appendTo(app$);
        this._switchBar = new sap.viz.controls.switchbar.SwitchBar(
                this._switchBar$[0], switchBarConfig);
        this._switchBar.connect(this._vizFrame.vizUid());
    }

    this._registerControl('sap.viz.controls.frame.VizFrame', this._vizFrame);
    if (this._vizBuilder) {
        this._registerControl('sap.viz.controls.builder.VizBuilder',
                this._vizBuilder);
    }
    if (this._switchBar) {
        this._registerControl('sap.viz.controls.switchbar.SwitchBar',
                this._switchBar);
    }

    this._validateAOs();
    this._validateSize();
};

sap.viz.ext.lumira.VizContainerLumira.prototype._updateChildren = function() {
    var options = {};
    if (this._requestedOptions) {
        if (this._requestedOptions.css) {
            options.css = this._requestedOptions.css;
        }
        if (this._requestedOptions.properties) {
            options.properties = this._requestedOptions.properties;
        }
        this._requestedOptions = null;
    }
    options.data = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
            .getFakedDataInstance(this.getVizType(), this.getVizData(), this
                    .getAggregation('feeds'));
    options.feeds = sap.viz.ext.lumira.controls.common.helpers.VizControlsHelperLumira
            .getFeedInstances(this.getAggregation('feeds'));

    this._vizFrame.vizUpdate(options);

    this._validateAOs();
};

sap.viz.ext.lumira.VizContainerLumira.prototype._validateAOs = function() {
    if (this._vizBuilder) {
        var aoInstaces = sap.viz.ui5.controls.common.feeds.AnalysisObject
                .toInstances(this.getAnalysisObjectsForPicker());
        this._vizBuilder.analysisObjectsForPicker(aoInstaces);
    }
};


sap.viz.ext.lumira.VizContainerLumira.prototype.setShowVizBuilder = function (showVizBuilder) {
        this.setProperty('showVizBuilder', showVizBuilder);
};


// need to validateSize in case the host(browser/control) size change.
sap.viz.ext.lumira.VizContainerLumira.prototype._validateSize = function() {
    var size = {
        'width' : this.$().width(),
        'height' : this.$().height()
    };

    if (this._uiConfig.layout === 'horizontal') {
        this._app$.css({
            'min-width' : '560px',
            // TODO Plus 1 for upper border, maybe it should fix in viz.controls
            'min-height' : '601px'
        });
    } else if (this._uiConfig.layout === 'vertical') {
        this._app$.css({
            'min-width' : '300px',
            'min-height' : '654px'
        });
    }

    var s = this.getParent().getParent().$();

    var appSize = {
        'width' : this._app$.width(),
        'height' : s.height() - 50 + 'px'
    };

    this.$().height(s.height() - 50 + 'px');

    if (this._uiConfig.layout === 'horizontal' && this._vizFrame) {
        var buiderWidth = this._vizBuilder$.width();


        if (!this.getShowVizBuilder()) {
            this._vizBuilder$.css({
                'display': 'none'
            });
            this._vSplitter$.css({
                'display': 'none'
            });
            this._vizFrame.size({
                'width' : appSize.width,
                'height' : appSize.height
            });
        } else {

            this._vizFrame.size({
                'width' : appSize.width - buiderWidth,
                'height' : appSize.height
            });

            this._vizBuilder.size({
                'width' : buiderWidth,
                'height' : s.height() - 51
            });

            this._vizBuilder$.css({
                'display': 'block',
                'left' : appSize.width - buiderWidth + 'px',
                'top' : '0px'
            });

            this._vSplitter$.css({
                'display': 'block',
                'left' : appSize.width - buiderWidth + 'px',
                'top' : '0px',
                'height' : appSize.height + 'px'
            });
        }

        this._vizFrame$.css({
            'left' : '0px',
            'top' : '0px'
        });

    } else if (this._uiConfig.layout === 'vertical' && this._vizFrame) {
        var switchBarWidth = 388;
        var switchBarHeight = 54;
        this._vizFrame.size({
            'width' : appSize.width,
            'height' : appSize.height - switchBarHeight
        });
        this._switchBar.size({
            'width' : switchBarWidth,
            'height' : switchBarHeight
        });
        this._vizFrame$.css({
            'left' : '0px',
            'top' : switchBarHeight + 'px'
        });
        this._switchBar$.css({
            'left' : (appSize.width - switchBarWidth) / 2 + 'px',
            'top' : (switchBarHeight - 36) / 2 + 'px'
        });
    }
    this.$().css({
        'overflow' : 'hidden'
    });
};