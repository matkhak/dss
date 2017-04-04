/*
 ************************************
 * Создание связей меж двух карточек *
 ************************************
 *
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "controller/card/link/formatter"
], function(Controller, JSONModel, Filter, MessageToast, History, formatter) {
	"use strict";
	return Controller.extend("controller.card.link.cardLink", {

		onInit: function() {
			let oModel = new JSONModel();
			oModel.loadData("model/linkType.json", {}, false); // прогрузим данные до конца
			oModel.getData().unshift({}); // добавим пустое значение
			this.getView().setModel(oModel, "linktype"); // теперь уже добавим в модель view

			let modelbo = new JSONModel();
			modelbo.loadData("xsjs/sp/getCardsList.xsjs", {}, false);
			modelbo.getData().unshift({}); // добавим пустое значение
			this.getView().setModel(modelbo, "boModel");

			let oInfoModel = new JSONModel(); // модель для выбора инфо-системы
			oInfoModel.loadData("../common_xsjs/getListInfoModels.xsjs", {}, false);
			this.getView().setModel(oInfoModel, "infoModel");
			this.loadData(oInfoModel.getData()[0].codeValue);

			/*  чтоб шла сразу на первый экран  */
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("card.link").attachPatternMatched(this.onPressCancel, this);
		},

		loadData: function(iIM) {
			var that = this;
			$.ajax({
				url: "xsjs/getLinks.xsjs",
				type: "GET",
				data: {
					"infomodel": iIM
				}
			}).done(function(answer) {
				var oModelLinks = new JSONModel(answer);
				that.getView().setModel(oModelLinks, "links");
			});
		},

		onIMChange: function() {
			this.loadData(this.byId("sIM").getSelectedKey());
		},

		/*  Проверить, есть ли уже связь. Если есть - показать  */
		checkLink: function() {
			let keyBO1 = this.byId("sBO1").getSelectedKey();
			let keyBO2 = this.byId("sBO2").getSelectedKey();

			var that = this;
			if (keyBO1 !== ":" && keyBO2 !== ":") {
				let iId1 = keyBO1.split(":")[0];
				let iVer1 = keyBO1.split(":")[1];
				let iId2 = keyBO2.split(":")[0];
				let iVer2 = keyBO2.split(":")[1];

				$.ajax({
					url: "xsjs/linkBo.xsjs",
					type: "GET",
					data: {
						idcard1: iId1,
						vercard1: iVer1,
						idcard2: iId2,
						vercard2: iVer2
					}
				})
					.done(function(answer) {
						if (answer.type) {
							that.byId("sJoin").setSelectedKey(answer.type);
							//that.byId("imgLink").setVisible(true);
							that.byId("imgLink").removeStyleClass("VisibleHidden");
							that.getView().setModel(new JSONModel(answer.atrs), "selected");
							that.getView().getModel("selected").refresh();
						} else {
							//that.byId("imgLink").setVisible(false);
							that.byId("imgLink").addStyleClass("VisibleHidden");
							that.byId("sJoin").setSelectedKey("");
						}
					})
					.fail(function(answer) {
						sap.m.MessageToast.show("ОШИБКА: " + answer.toString());
					})
					.always(function() {
						that.byId("p1").setBusy(false);
					});

			} else {
				//this.byId("imgLink").setVisible(false);
				this.byId("imgLink").addStyleClass("VisibleHidden");
				this.byId("sJoin").setSelectedKey("");
			}
		},

		onBO1Change: function() {
			let keyBO = this.byId("sBO1").getSelectedKey();
			let that = this;
			if (keyBO !== ":") {
				let iId = keyBO.split(":")[0];
				let iVer = keyBO.split(":")[1];

				$.ajax({
					url: "xsjs/sp/getAttributesForCard.xsjs",
					type: "GET",
					data: {
						id: iId,
						version: iVer
					}
				})
					.done(function(answer) {
						that.getView().setModel(new JSONModel([{}]), "selected");
						that.getView().setModel(new JSONModel(answer), "leftAll");
						that.checkLink();
					})
					.fail(function(answer) {
						sap.m.MessageToast.show("ОШИБКА: " + answer.toString());
					});
			}
		},

		onBO2Change: function() {
			let keyBO = this.byId("sBO2").getSelectedKey();
			let that = this;
			if (keyBO !== ":") {
				let iId = keyBO.split(":")[0];
				let iVer = keyBO.split(":")[1];

				$.ajax({
					url: "xsjs/sp/getAttributesForCard.xsjs",
					type: "GET",
					data: {
						id: iId,
						version: iVer
					}
				})
					.done(function(answer) {
						that.getView().setModel(new JSONModel([{}]), "selected");
						that.getView().setModel(new JSONModel(answer), "rigthAll");
						that.checkLink();
					})
					.fail(function(answer) {
						sap.m.MessageToast.show("ОШИБКА: " + answer.toString());
					});
			}
		},

		/**
		 * Добавление строки с атрибутами
		 */
		onPressAddAttr: function(oEvent) {
			this.getView().getModel("selected").getData().push({});
			this.getView().getModel("selected").refresh();
			this.hideButtonAdd();
		},

		/**
		 * Удаление строки с атрибутами
		 */
		onPressDelAttr: function(oEvent) {
			var index = parseInt(oEvent.getSource().getBindingContext("selected").sPath.split("/")[1]);
			this.getView().getModel("selected").getData().splice(index, 1);
			this.getView().getModel("selected").refresh();
			this.hideButtonAdd();
		},

		/*  Пробежаться по всем кнопкам [+] и сделать все невидимыми кроме последнего   */
		hideButtonAdd: function() {
			const LENGTH = this.byId("m").getContent().length;
			for (let i = 0; i < LENGTH; i++) {
				const l = this.byId("m").getContent()[i];
				for (let item of l.getContent()) {
					if (item.getId().indexOf("buttonAdd") > -1) {
						if ((i + 1) === LENGTH) {
							item.removeStyleClass("VisibleHidden");
						} else {
							item.addStyleClass("VisibleHidden");
						}
					}
				}
			}
		},

		/**
		 *      Сохранение связи между двумя БО (перебирая все атрибуты)
		 */
		onPressSave: function() {
			let keyBO1 = this.byId("sBO1").getSelectedKey();
			let keyBO2 = this.byId("sBO2").getSelectedKey();
			let sType = this.byId("sJoin").getSelectedKey();
			if (keyBO1 === ":" || keyBO2 === ":" || sType === "") {
				sap.m.MessageToast.show("Не выбраны БО, либо тип связи!");
				return;
			}
			if (keyBO1 === keyBO2) {
				sap.m.MessageToast.show("Нельзя настроить связь объекта на самого себя!");
				return;
			}
			let iID1 = keyBO1.split(":")[0];
			let iVer1 = keyBO1.split(":")[1];
			let iID2 = keyBO2.split(":")[0];
			let iVer2 = keyBO2.split(":")[1];

			// var atr = [{}];
			// for(let row of this.getView().getModel("selected").getData()) {
			// 	atr.push({"left": row.left, "right": row.right});
			// }
			var that = this;
			$.ajax({
				url: "xsjs/linkBo.xsjs",
				type: "POST",
				data: {
					idcard1: iID1,
					vercard1: iVer1,
					idcard2: iID2,
					vercard2: iVer2,
					type: sType,
					attrs: JSON.stringify(that.getView().getModel("selected").getData())
				}
			})
				.done(function(answer) {
					sap.m.MessageToast.show("Данные сохранены.");
					that.onPressCancel();
					that.onIMChange(); // обновить табличку с данными
				})
				.fail(function() {
					console.log("error");
				})
				.always(function() {
					that.byId("p1").setBusy(false);
				});
		},

		onPressCancel: function() {
			let navCon = this.getView().byId("navCon");
			navCon.to(this.getView().byId("p1"), "slide");
		},

		/*  Очистка Page "p2" - формы добавления/изменеия связей    */
		clearP2: function() {
			this.getView().byId("sBO1").setEnabled(true);
			this.getView().byId("sBO2").setEnabled(true);
			this.getView().byId("sBO1").setSelectedKey("");
			this.getView().byId("sBO2").setSelectedKey("");
			this.getView().byId("sJoin").setSelectedKey("");
			this.byId("imgLink").addStyleClass("VisibleHidden");
			//this.byId("imgLink").setVisible(false);
			this.getView().setModel(new JSONModel(), "rigthAll");
			this.getView().setModel(new JSONModel(), "leftAll");
			this.getView().setModel(new JSONModel(), "selected");
			this.getView().getModel("rigthAll").refresh();
			this.getView().getModel("leftAll").refresh();
			this.getView().getModel("selected").refresh();
		},

		/*  Добавление новой связи  */
		onPressAdd: function() {
			let navCon = this.getView().byId("navCon");
			navCon.to(this.getView().byId("p2"), "slide");
			this.clearP2();
		},

		onPressChange: function() {
			let ind = this.byId("table").getSelectedIndex()
			if (ind >= 0) {
				let navCon = this.getView().byId("navCon");
				navCon.to(this.getView().byId("p2"), "slide");
				this.getView().byId("sBO1").setSelectedKey(this.getView().getModel("links").getData()[ind].bo1id);
				this.getView().byId("sBO2").setSelectedKey(this.getView().getModel("links").getData()[ind].bo2id);
				this.getView().byId("sBO1").setEnabled(false);
				this.getView().byId("sBO2").setEnabled(false);
				this.onBO1Change();
				this.onBO2Change();
			} else {
				sap.m.MessageToast.show("Не выбрана строка в таблице.");
			}
		},

		/*      Удаление строки таблицы (сразу несколько записей из T_LINK)  */
		deleteLink: function() {
			let ind = this.byId("table").getSelectedIndex();
			let that = this;
			if (ind >= 0) {
				$.ajax({
					url: "xsjs/getLinks.xsjs",
					type: "DEL",
					data: {
						"ids": that.byId("table").getContextByIndex(ind).getProperty().ids
					}
				}).done(function() {
					sap.m.MessageToast.show("Удаление выполнено.");
					that.onIMChange();
					that.byId("table").setSelectedIndex(-1);
				})
					.fail(function(answer) {
						sap.m.MessageBox.show(answer.responseText, {
							icon: "ERROR",
							title: "Ошибка"
						});
					})
					.always(function() {
						that._oAddConfirmDialog.setBusy(false);
					});

			}
		},

		openAddConfirmDialog: function(Event) {
			if (!this._oAddConfirmDialog) {
				this._oAddConfirmDialog = sap.ui.xmlfragment("addConfirmDialog", "view.card.link.AddConfirmDialog", this);
				this.getView().addDependent(this._oAddConfirmDialog);
			}
			this._oAddConfirmDialog.open();
			// узнаем, какая кнопка нажата
			//this._activeButtonText = Event.getSource().getText();
		},

		onAddConfirmDialogYes: function() {
			this.deleteLink();
			this._oAddConfirmDialog.close();
		},

		onAddConfirmDialogCancel: function() {
			this._oAddConfirmDialog.close();
		},

		/**
		 * Кнопка "Домой" - идем на стартовый экран
		 */
		onReturnStartPage: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("init");
		}

	});
});