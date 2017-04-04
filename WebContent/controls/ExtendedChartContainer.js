/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @fileoverview Definition of tepaup.modules.right.controls.StyledChartContainer controller & renderer
 * @version 0.0.1
 */
jQuery.sap.declare('tepaup.controls.ExtendedChartContainer');
jQuery.sap.require('sap.suite.ui.commons.ChartContainer');

/**
 * Chart container with custom events and height changes
 * @class tepaup.controls.ExtendedChartContainer
 *
 * @extends sap.suite.ui.commons.ChartContainer
 */
sap.suite.ui.commons.ChartContainer.extend('tepaup.controls.ExtendedChartContainer', {
  metadata: {
    events: {
      onAfter: {},
    },
    properties: {
      bottomHeight: {
        type: 'int',
        defaultValue: 0,
      },
      showExcelButton: {
        type: 'boolean',
        defaultValue: false,
      },
    },
    aggregations: {
      toolbarButtons: {
        type: 'sap.m.Button',
        multiple: true,
        singularName: 'toolbarButton',
      },
    },
  },
  _vParent: null,
  _contentInited: false,
  _oDownloadExcelButton: null, // sap.m.Button
  _aUrls: [],

  renderer: {},

  getUrls: function () {
    return this._aUrls;
  },

  getUrl: function (i) {
    return this._aUrls[i];
  },

  setUrl: function (iIndex, sUrl) {
    this._aUrls[iIndex] = sUrl.replace('getData', 'getExcel');
  },

  setContentInited: function (bIsInited) {
    this._contentInited = bIsInited;
  },

  getContentInited: function () {
    return this._contentInited;
  },

  /**
   * init
   */
  init: function() {
    sap.suite.ui.commons.ChartContainer.prototype.init.apply(this, arguments);

    this._oDownloadExcelButton = new sap.m.Button({
      icon: 'sap-icon://download',
      type: sap.m.ButtonType.Transparent,
      press: jQuery.proxy(this._oDownloadExcelButtonHandler, this),
      tooltip: 'ÐÑÐ³ÑÑÐ·Ð¸ÑÑ Ð² Excel',
    });
  },

  /**
   * { function_description }
   *
   * @param {} e
   */
  _adjustIconsDisplay: function (e) {
    if (this._currentRangeName !== 'Phone') {
      for (var i = 0; i < this._customIconsAll.length; i++ )  {
        this._oToolBar.addContent(this._customIconsAll[i]);
      }
      if (this._aChartIcons.length > 3) {
        //show only allChart icon
        this._oToolBar.addContent(this._oShowAllChartButton);
      } else {
        this._oChartSegmentedButton.removeAllButtons();
        if (this._aChartIcons.length > 1) {
          for (var iChart = 0; iChart < this._aChartIcons.length; iChart++) {
            this._oChartSegmentedButton.addButton(this._aChartIcons[iChart]);
          }
          this._oToolBar.addContent(this._oChartSegmentedButton);
        }
      }
      this._oToolBar.addContent(this._oShowLegendButton);
      if (this.getShowPersonalization()) {
        this._oToolBar.addContent(this._oPersonalizationButton);
      }
      if (this.getShowZoom() && (sap.ui.Device.system.desktop)) {
        this._oToolBar.addContent(this._oZoomInButton);
        this._oToolBar.addContent(this._oZoomOutButton);
      }
      if (this.getShowFullScreen()) {
        this._oToolBar.addContent(this._oFullScreenButton);
      }
    } else {
      // add the phone popover
      this._preparePhonePopup();
      this._oToolBar.addContent(this._oPhonePopoverButton);
      // icon for ... is: horizontal-grip or overflow
    }


    var aCurrentContent = this._oToolBar.getContent();
    if (this.getShowExcelButton()) {
      this._oToolBar.insertContent(
          this._oDownloadExcelButton,
          aCurrentContent.length - 2
      );
    }

    this.getToolbarButtons().forEach(jQuery.proxy(
        function (el, i) {
          this._oToolBar.insertContent(
              el.clone(),
              aCurrentContent.length - 2
          );
        },
        this
    ));
  },

  /**
   * { function_description }
   */
  _oDownloadExcelButtonHandler: function () {
    var iUrlIndex = this.getContent().map(function (el) {
      return el.sId;
    }).indexOf(this.getSelectedChart().sId);
    var sUrl = this.getUrl(iUrlIndex);

    jQuery.download = function (url, data, method) {
      if (url && data) {
        var inputs = '';
        jQuery.each(data.split('&'), function () {
          var pair = this;
          inputs += '<input type="hidden" name="p" value="' + pair + '" />';
        });
        // send request
        jQuery('<form action="' + escape(url) + '" method="' +
          (escape(method) || 'post') + '">' + inputs + '</form>'
        ).appendTo('body').submit().remove();
      };
    };

    var sUrlParam = encodeURI(sUrl.split('?')[1].substr(2));
    // @todo ÑÐ±ÑÐ°ÑÑ ÑÐ°ÑÐ´ÐºÐ¾Ð´ Ð¸Ð· ÐºÐ¾Ð½ÑÑÐ¾Ð»Ð°
    jQuery.download(
      '/kpi_cio/monitor/services/getExcel.xsjs',
      sUrlParam,
      'GET'
    );
  },

});

/**
 *
 */
// Ð·Ð°ÑÐµÐ¼ Ð¾Ð½Ð¾?
tepaup.controls.ExtendedChartContainer.M_EVENTS = {
  onAfter: 'onAfter',
};
