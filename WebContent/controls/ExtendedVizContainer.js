/*!
 * (c) Copyright AO BDO 2016. All rights reserved
 */

jQuery.sap.declare('tepaup.controls.ExtendedVizContainer');
jQuery.sap.require('sap.viz.ui5.VizContainer');

sap.viz.ui5.VizContainer.extend('tepaup.controls.ExtendedVizContainer', {
    metadata: {
        properties: {
            showVizBuilder: { type : "boolean", group : "Misc", defaultValue : false }
        }
    },

    renderer: {},

    setShowVizBuilder: function (showVizBuilder) {
        this.setProperty('showVizBuilder', showVizBuilder);
    },

    _validateSize: function() {    	
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
    },
    
    onAfterRendering: function (oEvent) {
        sap.viz.ui5.VizContainer.prototype.onAfterRendering.apply(this, arguments);

        /* Важно чтобы deffered резолвился не сразу, так как chartcontainer
        внутри себя применяет отлоденные методы */
        setTimeout(function () {
          if (this.dRendererIsDone) {
            this.dRendererIsDone.resolve();
          }
        }.bind(this), 300);
      },

});