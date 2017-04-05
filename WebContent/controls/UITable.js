
sap.ui.define([
  'sap/ui/table/Table',
], function (Table) {
  return Table.extend('tepaup.controls.UITable', {

    _onColumnResize: function (oEvent) {
      debugger;
      if (this._iColumnResizeStart && oEvent.pageX < this._iColumnResizeStart + 3 && oEvent.pageX > this._iColumnResizeStart - 3) {
        return;
      }

      this._$colResize.addClass("sapUiTableColRszActive");
      this._iColumnResizeStart = null;

      var $this = this.$();

      var bRtl = this._bRtlMode;
      var iColIndex = parseInt(this._$colResize.attr("data-sap-ui-colindex"), 10);
      var oColumn = this.getColumns()[iColIndex];
      var $col = $this.find(".sapUiTableCtrlFirstCol > th[data-sap-ui-headcolindex='" + iColIndex + "']");

      // get the left position of the column to calculate the new width
      // relative to the parent container (sapUiTableCnt)!
      var iColLeft = $col.position().left;

      var iWidth;
      if (!bRtl) {
        // refine width calculation in case of fixed columns
        if (this.getFixedColumnCount() > 0 && iColIndex >= this.getFixedColumnCount()) {
          var iFixedColumnsWidth = $this.find(".sapUiTableColHdrFixed").width();
          iColLeft = iColLeft + iFixedColumnsWidth;

          // Consider scroll offset of non fixed area.
          iColLeft = iColLeft - $this.find(".sapUiTableCtrlScr").scrollLeft();
        }

        // find the total left offset from the document (required for pageX info)
        var iOffsetLeft = $this.find(".sapUiTableCtrlFirstCol > th:first").offset().left;

        // relative left position within the table scroll container
        var iRelLeft = oEvent.pageX - iOffsetLeft;

        // calculate the new width
        iWidth = iRelLeft - iColLeft;
      } else {
        var $ScrollArea;
        if (this.getFixedColumnCount() > 0 && iColIndex < this.getFixedColumnCount()) {
          $ScrollArea = $this.find('.sapUiTableCtrlScrFixed');
        } else {
          $ScrollArea = $this.find('.sapUiTableCtrlScr');
        }
        var iScrollAreaScrollLeft = $ScrollArea.scrollLeft();

        if (sap.ui.Device.browser.internet_explorer) {
          // Assume ScrollWidth=100px, Scroll to the very left in RTL mode
          // IE has reverse scroll position (Chrome = 0, IE = 100, FF = -100)
          iScrollAreaScrollLeft = $ScrollArea[0].scrollWidth - iScrollAreaScrollLeft - $ScrollArea[0].clientWidth;
        } else if (sap.ui.Device.browser.firefox) {
          // FF has negative reverse scroll position (Chrome = 0, IE = 100, FF = -100)
          iScrollAreaScrollLeft = iScrollAreaScrollLeft + $ScrollArea[0].scrollWidth - $ScrollArea[0].clientWidth;
        }

        //get the difference between where mouse was released and left side of the table
        var iDiff = iColLeft - iScrollAreaScrollLeft - oEvent.pageX + $ScrollArea.offset().left;
        iWidth = $col.outerWidth() + iDiff;
      }

      iWidth = Math.max(iWidth, /* oColumn.getMinWidth() || */ this._iColMinWidth);
      //iWidth = Math.min(iWidth, oColumn.getMaxWidth() || iWidth);

      // calculate and set the position of the resize handle
      var iRszOffsetLeft = $this.find(".sapUiTableCnt").offset().left;
      var iRszLeft = oEvent.pageX - iRszOffsetLeft;
      iRszLeft -= this._$colResize.width() / 2;


      if (oEvent.target && $(oEvent.target).hasClass('sapUiTableTdFirst')) {
        iRszLeft += 48;
      }

      this._$colResize.css("left", iRszLeft);

      // store the width of the column to apply later
      oColumn._iNewWidth = iWidth;
    },

    renderer: {},

  });
});
