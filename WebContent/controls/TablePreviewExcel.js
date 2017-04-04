/*!
 * (c) Copyright AO BDO 2015-2016. All rights reserved
 */
/**
 * @require sap.ui.core.Control
 */

sap.ui.define([
  'sap/ui/core/Control',
  ],  function(Control) {
    "use strict";

  /**
   * Таблица для отображения структуры выгружаемого excel
   *
   * @class zcust.controls.TablePreviewExcel
   * @extends sap.m.MultiComboBox
   *
   * @author Voronin Sergey <s.voroonin@bdo.ru>
   */

  return Control.extend('tepaup.controls.TablePreviewExcel', {

    metadata: {
      properties: {
        columns: {
          type: "object",
          defaultValue: [],
        },
        rows: {
          type: "object",
          defaultValue: [],
        },
      }
    },

    renderer: {
      render: function (oRM, oControl) {
        var aCols = oControl.getColumns();
        var aRows = oControl.getRows();

        oRM.write('<div');
        oRM.writeControlData(oControl);

        oRM.write('><table');
        oRM.addClass('schemaExcelTable');
        oRM.writeClasses();
        oRM.write('>');

        if (aCols.length) {
          oRM.write('<thead>');

          oRM.write('<tr><td class="dark-border-bottom dark-border-right" rowspan="'+(aCols.length+1)+'" colspan="'+(aRows.length+1)+'"></td><td align="center" class="group-name"><span>Столбцы</span></td></tr>');

          for (var i = 0; i < aCols.length; i++) {
            var sLastDimCol = aCols.length === (i+1) ? 'dark-border-bottom' : '';
            oRM.write('<tr>');
            oRM.write('<td class="back-dark '+sLastDimCol+'"><span>'+aCols[i].text+'</span></td>');
            oRM.write('</tr>');
          }

          oRM.write('</thead><tbody><tr>');

          oRM.write('<td align="center" class="mes-td mes-name group-name"><span >Строки</span></td>');

          for (var k = 0; k < aRows.length; k++) {
            var sLastMessCol = aRows.length === (k+1) ? 'dark-border-right' : '';
            var sWideClass = aRows[k].text.length > 50 ? 'WideCell' : '';
            oRM.write('<td class="mes-td back-dark '+sWideClass+' '+sLastMessCol+'"><span>'+aRows[k].text+'</span></td>');
          }
          oRM.write('<td class="dataCell"></td>');

          oRM.write('</tr></tbody>');
        }

        oRM.write('</table></div>');

      },
    },

  });

});
