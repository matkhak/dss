/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.JSONModel
 */
jQuery.sap.require('zcust.lib.JSONModel');
jQuery.sap.declare('tepaup.modules.main.model.gSelectedInds');

/**
 * [description]
 *
 * @class tepaup.modules.main.model.gSelectedInds
 * @extends zcust.lib.JSONModel
 */
zcust.lib.JSONModel.extend('tepaup.modules.main.model.gSelectedInds', {
  /**
   * @property {gSelectedInd[]} [gSelectedInds]
   *
   * ÐÐ¾ÐºÐ°Ð·Ð°ÑÐµÐ»Ñ
   * @typedef {object} gSelectedInd
   * @property {string} INDCD
   * @property {string} FNAME
   * @property {boolean} [selected=false]
   *
   * @memberOf tepaup.modules.main.model.gSelectedInds#
   */
  oModel: [],
});
