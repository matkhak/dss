/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @module main
 *
 * @requires zcust.lib.Controller
 * @requires tepaup.modules.main.model.gFilter
 * @requires tepaup.modules.main.model.gSettings
 * @requires tepaup.modules.main.model.gInds
 */
jQuery.sap.require('zcust.lib.Controller');
jQuery.sap.require('tepaup.modules.main.model.gFilter');
jQuery.sap.require('tepaup.modules.main.model.gSettings');
jQuery.sap.require('tepaup.modules.main.model.gInds');
jQuery.sap.require('tepaup.modules.main.model.gSelectedInds');

/**
 * @class tepaup.modules.main.controller.App
 * @extends zcust.lib.Controller
 *
 * @property {boolean} bGConfigsInit [bGConfigsInit description]
 */
zcust.lib.Controller.extend('tepaup.modules.main.controller.App', {
  bGConfigsInit: false,

  /* init */

  /**
   * Init application. Create global models.
   *
   * @param {oEvent} oEvent
   *
   * @memberOf tepaup.modules.main.controller.App#
   */
  onInit: function (oEvent) {
   
  },

  

});
