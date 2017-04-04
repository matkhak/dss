/*!
 * (c) Copyright AO BDO 2015. All rights reserved
 */
/**
 * @requires zcust.lib.JSONModel
 */
jQuery.sap.require('zcust.lib.JSONModel');
jQuery.sap.declare('tepaup.modules.main.model.gInds');

/**
 * [description]
 *
 * @class tepaup.modules.main.model.gInds
 * @extends zcust.lib.JSONModel
 */
zcust.lib.JSONModel.extend('tepaup.modules.main.model.gInds', {
  /**
   * @property {gInd[]} [gInds]
   *
   * @memberOf tepaup.modules.main.model.gInds#
   */
  oModel: {
    /**
     * ÐÐ¾ÐºÐ°Ð·Ð°ÑÐµÐ»Ñ
     * @typedef {object} gInd
     * @property {string} title
     * @property {string} description
     * @property {boolean} selected
     */
    gInds: [{
      gInd: '',
      INDCD: '',
      FNAME: '',
      selected: false,
    }],
  },
});
