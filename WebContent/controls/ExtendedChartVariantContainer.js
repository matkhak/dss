/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @fileoverview Definition of tepaup.modules.right.controls.StyledChartContainer controller & renderer
 * @version 0.0.1
 */
jQuery.sap.declare('tepaup.controls.ExtendedChartVariantContainer');
jQuery.sap.require('sap.suite.ui.commons.ChartContainer');

/**
 * Chart container with custom events and height changes
 * @class tepaup.controls.ExtendedChartVariantContainer
 *
 * @extends sap.suite.ui.commons.ChartContainer
 */
sap.suite.ui.commons.ChartContainer.extend('tepaup.controls.ExtendedChartVariantContainer', {
  metadata: {
    events: {
      // "onToggleLabelFramePress": {}
    },
    properties: {},
    aggregations: {}
  },

  dRendererIsDone: null,

  renderer: {},

  /**
   * init
   */
  init: function() {

    sap.suite.ui.commons.ChartContainer.prototype.init.apply(this, arguments);

    this._oVariantSelect = new sap.m.Select({
      id: 'vizConfSelect',
      visible: false
    });

    this._oVariantText = new sap.m.Text({
      text: "Преднастроенные варианты: "
    });

    this._oSyncButton = new sap.m.Button({
      icon: 'sap-icon://synchronize',
      type: 'Transparent',
      tooltip: 'Синхронизировать график с таблицей'
    }).addStyleClass('syncButton');

    this._oUpdateButton = new sap.m.Button({
      icon: 'sap-icon://complete',
      tooltip: 'Обновить данные'
    });

    this._toggleVizBuilder = new sap.m.Button({
      icon: 'sap-icon://popup-window',
      type: 'Transparent'
    });
    //
    // this._toggleLabelFrame = new sap.m.Button({
    //   icon: 'sap-icon://sys-add',
    //   type: 'Transparent',
    //   press: jQuery.proxy(this.fireOnToggleLabelFramePress, this)
    // });
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
    this._oToolBar.insertContent(this._toggleVizBuilder, aCurrentContent.length - 1);
    this._oToolBar.insertContent(this._oSyncButton, aCurrentContent.length - 1);
    this._oToolBar.insertContent(this._oUpdateButton, aCurrentContent.length - 1);
    //Выбор преднастроенных вариантов (не используется)
    this._oToolBar.insertContent(this._oVariantSelect, aCurrentContent.length - 1);
    //this._oToolBar.insertContent(this._oVariantText, aCurrentContent.length - 1);
    //
    // var labelFrameButton = this._toggleLabelFrame;
    // console.log(labelFrameButton);
    // labelFrameButton.aCustomStyleClasses = ["labelFrameButton"];
    // this._oToolBar.insertContent(labelFrameButton, aCurrentContent.length - 1);
  },

  onAfterRendering: function (oEvent) {
    sap.suite.ui.commons.ChartContainer.prototype.onAfterRendering.apply(this, arguments);

    /* Важно чтобы deffered резолвился не сразу, так как chartcontainer
    внутри себя применяет отлоденные методы */
    setTimeout(function () {
      if (this.dRendererIsDone) {
        this.dRendererIsDone.resolve();
      }
    }.bind(this), 300);
  },

  /**
    * Следующие методы (setFullScreen, toggleFullScreen, openFullScreen)
    * были дополнены для детальной страницы, что иметь возможность скрывать
    * окно с графиком на все окно при выгрузке в excel
    */
  setFullScreen: function(bFullScreen/*@zend*/, bHidePopup/*@z*/ ){
    if (this._firstTime) {
      // can't set the full screen and toggle since dom is not loaded yet
      return;
    }
    var fullScreen = this.getProperty("fullScreen");
    if (fullScreen !== bFullScreen) {
      this.toggleFullScreen(/*@zend*/bHidePopup/*@z*/);
    }
  },

  toggleFullScreen: function(/*@zend*/bHidePopup/*@z*/ ) {
    this._bSegmentedButtonSaveSelectState = true;
    var fullScreen = this.getProperty("fullScreen");
    var sId;
    var sHeight;
    if (fullScreen) {
      this.closeFullScreen();
      this.setProperty("fullScreen", false);
      sId = this.getSelectedChart().getContent().getId();
      this.getSelectedChart().getContent().setWidth("100%");
      sHeight = this._chartHeight[sId];
      if ((sHeight !== 0) && (sHeight !== null)) {
        this.getSelectedChart().getContent().setHeight(sHeight);
      }
      this.invalidate();
    } else {
      var aObjects = this.getAggregation("content");
      this._chartHeight = {};
      if (aObjects) {
        for (var i = 0; i < aObjects.length; i++) {
          sId = aObjects[i].getContent().getId();
          if (typeof aObjects[i].getContent().getHeight == 'function') {
            sHeight = aObjects[i].getContent().getHeight();
          } else {
            sHeight = 0;
          }
          this._chartHeight[sId] = sHeight;
          }
        }
  //*to fix chart disappear when toggle chart with full screen button
      jQuery.sap.delayedCall(100, this, function() {
        this.openFullScreen(this, true/*@zend*/, bHidePopup/*@z*/);
      });
      this.setProperty("fullScreen", true);
    }
    var sIcon = (fullScreen ? "sap-icon://full-screen" : "sap-icon://exit-full-screen");
    this._oFullScreenButton.setIcon(sIcon);
  },

  openFullScreen: function(oContent, bNeedsScroll/*@zend*/, bHidePopup/*@z*/) {
    if ((bNeedsScroll != null) && (bNeedsScroll == true)) {
      this._oScrollEnablement = new sap.ui.core.delegate.ScrollEnablement(oContent, oContent.getId() + "-wrapper", {
        horizontal : true,
        vertical : true
      });
    }
    this.$content = oContent.$();
    if (this.$content) {

      // var domContent = oContent.getDomRef();
      //this.$parentNode = this.$content.parent();
      this.$tempNode = jQuery("<div></div>"); // id='" + this.$content.attr("id")+"-overlay"+ "'
      this.$content.before(this.$tempNode);

      this._$overlay = jQuery("<div id='" + jQuery.sap.uid() + "'></div>");
  //    this._$overlay.addClass("sapCaUiOverlay");
      this._$overlay.addClass("sapSuiteUiCommonsChartContainerOverlay");
      /*@zend*/
      if (bHidePopup.hidePopup) {
        this._$overlay.addClass("importantHide");
      }
      /*@zend*/
      this._$overlay.append(this.$content);
      this._oPopup.setContent(this._$overlay);
    } else {
      jQuery.sap.log.warn("Overlay: content does not exist or contains more than one child");
    }
  //  this._oToolBar.setDesign(sap.m.ToolbarDesign.Solid);
    this._oPopup.open(200, null, jQuery("body"));

  },


});
