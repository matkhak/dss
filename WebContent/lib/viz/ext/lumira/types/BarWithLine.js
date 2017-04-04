jQuery.sap.declare('sap.viz.ext.lumira.types.BarWithLine');

sap.viz.ext.lumira.types.BarWithLine = {};

sap.viz.ext.lumira.types.BarWithLine.init = function () {
    var util = { /*__FOLD__*/
    /*
     * Converts data to flatten table format. Accepts MultiAxisDataAdapter, CrosstableDataset and FlattableDataset as data input.
     * Invocation example:
     * _util.toTable(data, [mapper], callback);
     * data : data input
     * mapper[optional] : a mapper that maps each data to another format.
     * eg. mapper = function(d, [meta]){...}
     * callback : accepts the error message and output data to generate visualization.
     * eg. callback = function(err, data, [meta]){...}
     */
    toTable: function(data, f1, f2) {
      var cb = f2 || f1,
        mapper = f2 ? f1 : undefined,
        rows;
      try {
        var me = this,
          parser = me._getParser(data);
        rows = parser.call(me, data);
        if (!rows) {
          rows = [];
        }
        me._meta = rows.meta;

        if (mapper) {
          rows = rows.map(function(d) {
            return mapper(d, me._meta);
          });
          rows.meta = me._meta;
        }
      } catch (err) {
        return cb(err, null, null);
      }
      if (cb) {
        return cb(null, rows, me._meta);
      } else {
        return rows;
      }

    },

    buildNameIdx: function(feeds) {
      if (feeds) {
        this._feeds = feeds;
        this._dimMap = {};
        this._mgMap = {};
        var that = this;
        feeds.forEach(function(feed) {
          if (feed.aaIndex) {
            that._dimMap[feed.name] = feed.aaIndex - 1;
          } else {
            that._mgMap[feed.name] = feed.mgIndex - 1;
          }
        });
      }
    },

    _getParser: function(data) {
      if (data.dataset) {
        var dataset = data.dataset;
        if (dataset.table) {
          return this._flat;
        } else {
          return this._cross;
        }
      }
      return this._cross;
    },

    _flat: function(data) {
      var dataset = data.dataset;
      var ret = dataset.table();
      ret.meta = {
        _dimensionSets: [dataset.dimensions()],
        _measureSets: [dataset.measures()],

        dimensions: function(i, j) {
          if (arguments.length === 2) {
            return this._dimensionSets[0][j];
          }
          return this._dimensionSets[0];
        },

        measures: function(i, j) {
          if (arguments.length === 2) {
            return this._measureSets[0][j];
          }
          return this._measureSets[0];
        }
      };

      return ret;
    },

    _parseMeta: function(meta) {
      if (!meta) {
        return null;
      } else {
        return {
          _dimMap: this._dimMap,
          _mgMap: this._mgMap,
          _meta: {
            measureSets: (function(measureSets) {
              var tmp = [];
              $.each(measureSets, function(idx, ele) {
                tmp[idx] = ele.map(function(d) {
                  return d.measure;
                });
              });
              return tmp;
            }(meta.measureSets)),
            dimSets: (function(dimSets) {
              var tmp = [];
              $.each(dimSets, function(idx, ele) {
                tmp[idx] = ele.map(function(d) {
                  return d.dimension;
                });
              });
              return tmp;
            }(meta.dimSets))
          },
          measures: function(i, j) {
            if (arguments.length === 0) {
              var ret = [];
              $.each(this._meta.measureSets, function(idx, ms) {
                $.each(ms, function(idx, measure) {
                  ret.push(measure);
                });
              });
              return ret;
            } else if (arguments.length === 1) {
              if (this._mgMap && this._mgMap[i] !== undefined) {
                i = this._mgMap[i];
              }
              if (!this._meta.measureSets[i]) {
                throw "MeasureGroup \"" + i + "\" not found!";
              }
              return this._meta.measureSets[i];
            } else {
              return this._meta.measureSets[i][j];
            }
          },
          dimensions: function(i, j) {
            if (arguments.length === 0) {
              var ret = [];
              $.each(this._meta.dimSets, function(idx, ds) {
                $.each(ds, function(idx, dim) {
                  ret.push(dim);
                });
              });
              return ret;
            } else if (arguments.length === 1) {
              if (this._dimMap && this._dimMap[i] !== undefined) {
                i = this._dimMap[i];
              }
              if (!this._meta.dimSets[i]) {
                throw "Dimension Set \"" + i + "\" not found!";
              }
              return this._meta.dimSets[i];
            } else {
              return this._meta.dimSets[i][j];
            }
          }
        };
      }
    },

    _extractCtx: function(meta, data, fdata) {
      var ctx = {},
        mvLen = data._mg[0].values[0].rows.length,
        vLen = data._mg[0].values[0].rows[0].length,
        dataCtx = [],
        i, j;

      for (i = 0; i < mvLen; i++) {
        var arr = [];
        for (j = 0; j < vLen; j++) {
          arr.push({});
        }
        dataCtx.push(arr);
      }
      $.each(data._mg, function(idx_mg, mg) {
        $.each(mg.values, function(idx_mv, mgValue) {
          var ctxRows = [];
          ctx[mgValue.col] = ctxRows;
          $.each(mgValue.rows, function(idx_a2, rows) {
            $.each(rows, function(idx_a1, row) {
              ctxRows.push(row.ctx);
              dataCtx[idx_a2][idx_a1][mgValue.col] = row.ctx;
            });
          });
        });
      });
      $.each(data._aa, function(idx, aa) {
        $.each(aa.values, function(idx, axis) {
          var ctxRows = [];
          ctx[axis.col.val] = ctxRows;
          $.each(axis.rows, function(idx, row) {
            ctxRows.push(row.ctx);
          });
        });
      });
      fdata.forEach(function(e, idxFdata) {
        Object.defineProperty(e, "context", {
          enumerable: false,
          get: function() {
            return (function(ctxs) {
              return function(measure) {
                if (ctxs && ctxs[measure]) {
                  return {
                    ctx: [ctxs[measure].path]
                  };
                }
                return {
                  ctx: [ctxs[measure]]
                };
              };
            }(dataCtx[Math.floor(idxFdata / vLen)][idxFdata % vLen]));
          }
        });
      });
      meta._ctx = ctx;
      meta.context = function(col, dataIdx) {
        return this._ctx[col][dataIdx];
      };
    },

    _cross: function(data) {
      var ret = this._toFlattenTable(data);
      if (!ret) {
        return null;
      }
      return ret;
    },
    /*
     * extract dimension sets from data
     * @param data [Crosstable Dataset] crosstable dataset
     * @returns array of dimension sets, and each dimension set is an object of {dimension: "dimension name", data: [members]}.
     * e.g. [{dimension: "country", data: ["China", "US", ...]}, {dimension: "year", data: ["2010", "2011", ...]}, ...]
     */
    _extractDimSets: function(data) {
      var dimSet1, dimSet2, res = [];
      if (data.getAnalysisAxisDataByIdx) {
        dimSet1 = data.getAnalysisAxisDataByIdx(0);
        dimSet2 = data.getAnalysisAxisDataByIdx(1);
      } else if (data.dataset && data.dataset.data) {
        var analysisAxis = data.dataset.data().analysisAxis;
        if (analysisAxis) {
          analysisAxis.forEach(function(g) {
            var resg = [];
            g.data.forEach(function(d) {
              var result = {};
              result.data = [];
              for (var prop in d.values) {
                if (d.values.hasOwnProperty(prop)) {
                  result.data[prop] = d.values[prop];
                }
              }
              result.dimension = d.name;
              resg.push(result);
            });
            res.push(resg);
          });
        }
        return res;
      }

      $.each([dimSet1, dimSet2], function(idx, dimSet) {
        dimSet = dimSet ? dimSet.values : undefined;
        if (!dimSet) {
          return;
        }
        var dims = [],
          dim;
        for (var i = 0; i < dimSet.length; i++) {
          dim = {
            dimension: dimSet[i].col.val,
            data: []
          };
          for (var j = 0; j < dimSet[i].rows.length; j++) {
            dim.data.push(dimSet[i].rows[j].val);
          }
          dims.push(dim);
        }
        res.push(dims);
      });
      return res;
    },

    /*
     * extract measure sets from data
     * @param data [Crosstable Dataset] crosstable dataset
     * @returns array of measures, and each measure is an object of {measure: "measure name", data: [measure data]}.
     * for example, [[{measure: "income", data: [555, 666, 777, ...]}, {measure: "cost", data:[55, 66, 77, ...]}, ...], ...]
     */
    _extractMeasureSets: function(data) {
      var measureSet1, measureSet2, measureSet3, reses = [];
      if (data.getMeasureValuesGroupDataByIdx) {
        measureSet1 = data.getMeasureValuesGroupDataByIdx(0);
        measureSet2 = data.getMeasureValuesGroupDataByIdx(1);
        measureSet3 = data.getMeasureValuesGroupDataByIdx(2);
      } else if (data.dataset && data.dataset.data) {
        data.dataset.data().measureValuesGroup.forEach(function(g) {
          var resg = [];
          g.data.forEach(function(d) {
            var result = {};
            result.data = [];
            for (var prop in d.values) {
              if (d.values.hasOwnProperty(prop)) {
                result.data[prop] = d.values[prop];
              }
            }
            result.measure = d.name;
            resg.push(result);
          });
          reses.push(resg);
        });
        return reses;
      }

      $.each([measureSet1, measureSet2, measureSet3], function(idx, measureSet) {
        measureSet = measureSet ? measureSet.values : undefined;
        if (!measureSet) {
          return;
        }
        var res = [],
          resItem, resData, measure;
        for (var k = 0; k < measureSet.length; k++) {
          measure = measureSet[k];
          resItem = {
            measure: measure.col,
            data: []
          };
          resData = resItem.data;
          for (var i = 0; i < measure.rows.length; i++) {
            resData[i] = [];
            for (var j = 0; j < measure.rows[i].length; j++) {
              resData[i].push(measure.rows[i][j].val);
            }
          }
          res.push(resItem);
        }
        reses.push(res);
      });

      return reses;
    },

    /*
     * convert crosstable data to flatten table data
     * @param data [Crosstable Dataset] crosstable dataset or MultiAxisDataAdapter
     * @returns array of objects, and each object represents a row of data table:
     * [{"dimension name1" : value1, "dimension name2" : value2, "measure name1" : value3}, ....{"dimension name1" : valueN1, "dimension name2" : valueN2, "measure name1" : valueN3} ]
     *
     * This method returns an extra meta data in data.meta, which includes all dimension and measure sets.
     */
    _toFlattenTable: function(data) {
      var dimSets = this._extractDimSets(data),
        measureSets = this._extractMeasureSets(data),
        fdata = [],
        meta,
        ctx,
        d;
      //measureValueGroup is necessary in crosstable dataset
      //please directly call _util.extractDimSets() to get dimension values
      if (measureSets.length === 0) {
        return undefined;
      }
      meta = {
        dimSets: dimSets,
        measureSets: measureSets
      };

      if (data.getAnalysisAxisDataByIdx) {
        fdata = this._toFlatJsonArray(measureSets, dimSets);
        /**Extract data context for MultiAxisDataAdapter*/
        meta = this._parseMeta(meta);
        this._extractCtx(meta, data, fdata);
      } else {
        if (data && data.dataset) {
          d = new sap.viz.api.data.CrosstableDataset();
          d.data(data.dataset.data());
          d.info(data.dataset.info());
        } else if (data) {
          d = data;
        }
        if (sap.viz.extapi.utils && sap.viz.extapi.utils.Data && sap.viz.extapi.utils.Data.getDataContext) {
          ctx = sap.viz.extapi.utils.Data.getDataContext(d);
        }
        fdata = this._toFlatJsonArray(measureSets, dimSets, ctx);
        meta = this._parseMeta(meta);
      }

      //fill meta data. for compatible
      fdata.meta = meta;
      return fdata;
    },

    _toFlatJsonArray: function(measureSets, dimSets, ctx) {
      //convert data from ct to flat
      var fdata = [],
        measure0Data, i, j, m, measure, datumCtx, datum;

      measure0Data = measureSets[0][0].data;
      for (i = 0; i < measure0Data.length; i++) {
        for (j = 0; j < measure0Data[i].length; j++) {
          datum = {};
          datumCtx = {};
          $.each(dimSets, function(idx, dimSet) {
            if (!dimSet) {
              return;
            }
            var counter = idx === 0 ? j : i;
            for (m = 0; m < dimSet.length; m++) {
              datum[dimSet[m].dimension] = dimSet[m].data[counter];
            }
          });
          $.each(measureSets, function(idx, measureSet) {
            if (!measureSet) {
              return;
            }
            for (m = 0; m < measureSet.length; m++) {
              measure = measureSet[m];
              datum[measure.measure] = measure.data[i][j];
              if (ctx) {
                /**currently not support same measure name in different measureGroup*/
                datumCtx[measure.measure] = ctx[idx][m][i][j];
              }
            }
          });
          if (ctx) {
            Object.defineProperty(datum, "context", {
              enumerable: false,
              value: (function(ctxs) {
                return function(measure) {
                  if (ctxs && ctxs[measure]) {
                    return {
                      ctx: [ctxs[measure].path]
                    };
                  }
                  return {
                    ctx: [ctxs[measure]]
                  };
                };
              }(datumCtx))
            });
          }
          fdata.push(datum);
        }
      }
      return fdata;
    },

    composeSelection: function(measure, val, ele, ctx) {
      var len = 1,
        selectionData = [],
        selectElements = [];

      for (var i = 0; i < len; i++) {
        selectionData.push({
          val: val,
          ctx: ctx
        });
      }

      selectElements.push({
        target: ele,
        data: selectionData
      });
      return selectElements;
    }
  };

  var dataMapping = function(data, feeds, done) {
    // Build name index so that dimension/measure sets can be accessed by name
    util.buildNameIdx(feeds);
    /*
     * mapper function is optional and used to customize your data conversion logic, for example,
     * you can map from object array to a simplified x-y value array as below,
     *
     *     var mapper = function(d, meta) {
     *         var val = parseFloat(d[meta.measures(0, 0)]);
     *         mems = [];
     *         $.each(meta.dimensions(), function(idx, dim) {
     *             mems.push(d[dim]);
     *        });
     *       return [mems.join(" / "), val];
     *     }
     */
    var mapper = function(d) {
      return d;
    };
    // convert data into an object array, which is compatible to the return of
    // d3.csv() by default. Each data row is converted into attributes of an object.
    util.toTable(data, mapper, function(err, pData) {
      if (err) {
        return done(err, null);
      } else if (!pData) {
        return done("Empty data", null);
      }
      return done(null, pData);
    });
  };








  var render = function(data, container) {
    var margin = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 40
    };
    var width = this.width() - margin.left - margin.right,
      height = this.height() - margin.top - margin.bottom,
      colorPalette = this.colorPalette();
    // properties = this.properties(),
    // dispatch = this.dispatch();
    //prepare canvas with width and height of container
    container.selectAll('svg').remove();
    var vis = container.append('svg').attr('width', width).attr('height', height)
      .append('g').attr('class', 'vis').attr('width', width).attr('height', height);

    // START: sample render code for a column chart
    // Replace the code below with your own one to develop a new extension

    /**
     * To get the dimension set, you can use either name or index of the dimension set, for example
     *     var dset_xaxis = data.meta.dimensions('X Axis’);    // by name
     *     var dset1 = data.meta.dimensions(0);                // by index
     *
     * To get the dimension or measure name, you should only use index of the dimension and avoid
     * hardcoded names.
     *     var dim1= dset_xaxis[0];        // the name of first dimension of dimension set ‘X Axis'
     *
     * The same rule also applies to get measures by using data.meta.measures()
     */
    var meta = data.meta,
      dims = meta.dimensions('X Axis'),
      y_measures = meta.measures('Y Axis');

    var dimensionName = dims[0]; //we only use one dimension in this chart
    //var dimensionName = meta.dimensions(0,0);

    //OMFG WTF?
    //var valueLineMeasureName = meta.measures("Y Axis 2")[0]; //we only have one value line measure

    var valueLineMeasureName = meta.measures("Y Axis 2");
    var csvData = data;

    var margin = {
        top: 10,
        right: 200,
        bottom: 60,
        left: 50
      },
      width = width - margin.left - margin.right,
      height = height - margin.top - margin.bottom;
    var legendSpacing = 60;
    var legend_X_Pos = margin.left + width + legendSpacing;
    var legend_width = 18;
    var legend_Text_X_Pos = legend_X_Pos + legend_width + 4;

    var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

    var y = d3.scale.linear()
      .rangeRound([height, 0]);

    var y2 = d3.scale.linear()
      .rangeRound([height, 0]);

    //We use 20 colors by default for the stacked columns and value line. If there are more measures, adjust this line
    var color = d3.scale.ordinal().range(colorPalette);
    var xAxis = d3.svg.axis2()
      .scale(x)
      .orient("bottom");

    var yAxis = d3.svg.axis2()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".2s"))
      .tickSize(-width); //this creates the trellis

    var y2Axis = d3.svg.axis2()
      .scale(y2)
      .orient("right")
      .tickSize(4)
      .tickFormat(d3.format(".2s"));

    // Define the value line
    var valueline = d3.svg.line()
      .x(function(d) {
        return x(d[dimensionName]) + x.rangeBand() / 2;
      })
      .y(function(d) {
        return y2(d[valueLineMeasureName]);
      });

    var svg = vis.append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    color.domain(d3.keys(csvData[0]).filter(function(key) {
      return key !== dimensionName && key !== valueLineMeasureName;
    }));
    csvData.forEach(function(d) {
      var y0 = 0;
      d.MeasureGroup1 = color.domain().map(function(name) {
        return {
          name: name,
          y0: y0,
          y1: y0 += +d[name],
          dim: d[dimensionName]
        };
      });
      d.total = d.MeasureGroup1[d.MeasureGroup1.length - 1].y1;
    });

    //This sorts the columns
    //csvData.sort(function (a, b) { return a.total - b.total; });

    x.domain(csvData.map(function(d) {
      return d[dimensionName];
    }));

    //Add 20% to the input domain to avoid columns reaching the top
    y.domain([0, 1.2 * d3.max(csvData, function(d) {
      return d.total;
    })]).nice();
    y2.domain([0, 1.2 * d3.max(csvData, function(d) {
      return d[valueLineMeasureName];
    })]).nice();

    //Add the X axis
    svg.append("g")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_X_axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("y", 9)
      .attr("x", 0)
      .attr("dy", ".71em")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    vis.append("text")
      .attr("x", margin.left + width / 2)
      .attr("y", height + margin.bottom)
      .attr("text-anchor", "middle")
      .attr("style", "font-weight:bold")
      .text(dimensionName);

    //Add the Y axis on the left
    svg.append("g")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_Y_axis")
      .call(yAxis);

    vis.append("text")
      .attr("transform", "rotate(-90 20" + " " + height / 2 + ")")
      .attr("x", 20)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("style", "font-weight:bold")
      .text(function() {
        var y_label = "";
        for (var k = 0; k < y_measures.length; k++) {
          y_label += y_measures[k];
          if (y_label.length > 50 && k < y_measures.length - 1) {
            y_label += "...";
            break;
          }
          if (k < y_measures.length - 1)
            y_label += ", ";
        }
        return y_label;
      });

    //Add Y Axis 2 on the right
    svg.append("g")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_Y_axis")
      .attr("transform", "translate(" + width + ",0)")
      .call(y2Axis);

    vis.append("text")
      .attr("transform", "rotate(-90 " + (margin.left + width + 50) + " " + height / 2 + ")")
      .attr("x", margin.left + width + 50)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("style", "font-weight:bold")
      .text(valueLineMeasureName);

    //Add the stacked columns
    var column = svg.selectAll(".sap_viz_ext_stackedcolumnlinechart_column")
      .data(csvData)
      .enter().append("g")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_column")
      .attr("transform", function(d) {
        return "translate(" + x(d[dimensionName]) + ",0)";
      });

    column.selectAll("rect")
      .data(function(d) {
        return d.MeasureGroup1;
      })
      .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) {
        return y(d.y1);
      })
      .attr("height", function(d) {
        return y(d.y0) - y(d.y1);
      })
      .attr("fill", function(d) {
        return color(d.name);
      })
      .attr("stroke", function(d) {
        return ColorLuminance(color(d.name), -0.3);
      })
      .attr("stroke-width", 0)
      .on("mouseover", function() {
        d3.select(this)
          .attr("stroke-width", 2);
      })
      .on("mouseout", function(d) {
        d3.select(this)
          .transition()
          .duration(250)
          .attr("stroke-width", 0);
      })
      .append("title")
      .text(function(d) {
        return dimensionName + ": " + d.dim + "\n" + d.name + ": " + (d.y1 - d.y0)
      });

    //Add the Value line with data dots
    var lineColor = colorPalette[y_measures.length + 1]; // Use the second next color to avoid the color being too close to the column
    // Add the value line path.
    svg.append("path")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_line")
      .attr("stroke", lineColor)
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("d", valueline(csvData));

    //Add the data dots in the value line
    svg.selectAll(".dot")
      .data(csvData)
      .enter().append("circle")
      .attr("r", 3.5)
      .attr("stroke", lineColor)
      .attr("stroke-width", 2)
      .attr("fill", lineColor)
      .attr("cx", function(d) {
        return x(d[dimensionName]) + x.rangeBand() / 2;
      })
      .attr("cy", function(d) {
        return y2(d[valueLineMeasureName]);
      })
      .on("mouseover", function() {
        d3.select(this)
          .attr("stroke", ColorLuminance(lineColor, -0.3));
      })
      .on("mouseout", function(d) {
        d3.select(this)
          .transition()
          .duration(250)
          .attr("stroke", lineColor);
      })
      .append("title")
      .text(function(d) {
        return dimensionName + ": " + d[dimensionName] + "\n" + valueLineMeasureName + ": " + d[valueLineMeasureName]
      });

    //Add the legend
    var legend = vis.selectAll(".sap_viz_ext_stackedcolumnlinechart_legend")
      .data(color.domain().slice().reverse())
      .enter().append("g")
      .attr("class", "sap_viz_ext_stackedcolumnlinechart_legend")
      .attr("transform", function(d, i) {
        return "translate(0," + (20 + i * 20) + ")";
      });

    legend.append("rect")
      .attr("x", legend_X_Pos)
      .attr("width", legend_width)
      .attr("height", legend_width)
      .style("fill", color);

    legend.append("text")
      .attr("x", legend_Text_X_Pos)
      .attr("y", legend_width / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(function(d) {
        return (d.length < 18) ? d : (d.substring(0, 16) + "...");
      });

    //Add the legend for value line separately
    var valueLineLegend = vis.append("g");
    valueLineLegend.append("line")
      .attr("x1", legend_X_Pos)
      .attr("y1", legend_width / 2)
      .attr("x2", legend_X_Pos + legend_width)
      .attr("y2", legend_width / 2)
      .attr("stroke", lineColor);

    valueLineLegend.append("text")
      .attr("x", legend_Text_X_Pos)
      .attr("y", legend_width / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text((valueLineMeasureName.length < 18) ? valueLineMeasureName : (valueLineMeasureName.substring(0, 16) + "..."));

    function ColorLuminance(hex, lum) {
      // validate hex string
      hex = String(hex).replace(/[^0-9a-f]/gi, '');
      if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      lum = lum || 0;

      // convert to decimal and change luminosity
      var rgb = "#",
        c, i;
      for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
      }
      return rgb;
    }
    // END: sample render code
  };









  var moduleFunc = {
    render: function(selection) {
      //add xml ns for root svg element, so the image element can be exported to canvas
      $(selection.node().parentNode.parentNode).attr("xmlns:xlink", "http://www.w3.org/1999/xlink");

      var that = this,
        dispatch = this.dispatch(),
        feeds = this.feeds(),
        data = this.data();

      dispatch.startToInit();
      selection.each(function() {
        dataMapping(data, feeds, function(err, pData) {
          if (err) {
            throw err;
          }
          render.call(that, pData, selection);
        });
      });
      dispatch.initialized({
        name: "initialized"
      });
    },
    dispatch: function() {
      if (!this._dispatch) {
        this._dispatch = d3.dispatch("initialized", "startToInit", "barData", "selectData");
      }
      return this._dispatch;
    },
    feeds: function() {
      return this._manifest.feeds;
    }
  };
  /*
   * export current extension to the specified content.
   * @param {Object} options the options for exporting content.
   * @example:
   * {
   *   type: String - current only support "svg".
   *   width: Number - the exported content will be scaled to the specific width.
   *   height: Number - the exported content will be scaled to the specific height.
   * }
   */
  moduleFunc.exportContent = function(options) {
    // TODO:  add your own code below to export the current extension to specific content type as 'svg' or 'png'.
  };

  /*
   * determine if the extension support to be exported to the specific <param>contentType</param>, e.g. "svg" or "png"
   * @param {String} contentType the content type to be exported to.
   */
  moduleFunc.supportExportToContentType = function(contentType) {
    return false;
    // TODO: add your own code below to enable export to specific content type as 'svg' or 'png'.
  };






  var flowRegisterFunc = function() {
    var flow = sap.viz.extapi.Flow.createFlow({
      id: "sap.viz.ext.stackedcolumnlinechart2",
      name: "Bar Column with Line Chart",
      dataModel: "sap.viz.api.data.CrosstableDataset",
      type: "BorderSVGFlow"
    });

    var element = sap.viz.extapi.Flow.createElement({
      id: "sap.viz.ext.stackedcolumnlinechart2.PlotModule",
      name: "Stacked Column with Line Chart Module"
    });
    element.implement("sap.viz.elements.common.BaseGraphic", moduleFunc);

    /*Feeds Definition*/
    var ds1 = {
      "id": "sap.viz.ext.stackedcolumnlinechart2.PlotModule.DS1",
      "name": "X Axis",
      "type": "Dimension",
      "min": 0, //minimum number of data container
      "max": 2, //maximum number of data container
      "aaIndex": 1
    };
    element.addFeed(ds1);

    var ms1 = {
      "id": "sap.viz.ext.stackedcolumnlinechart2.PlotModule.MS1",
      "name": "Y Axis",
      "type": "Measure",
      "min": 0, //minimum number of measures
      "max": Infinity, //maximum number of measures
      "mgIndex": 1
    };
    element.addFeed(ms1);

    var ms2 = {
      "id": "sap.viz.ext.stackedcolumnlinechart2.PlotModule.MS2",
      "name": "Y Axis 2",
      "type": "Measure",
      "min": 0, //minimum number of measures
      "max": Infinity, //maximum number of measures
      "mgIndex": 2
    };
    element.addFeed(ms2);

    element.addProperty({
      name: "colorPalette",
      type: "StringArray",
      supportedValues: "",
      defaultValue: d3.scale.category20().range().concat(d3.scale.category20b().range()).concat(d3.scale.category20c().range())
    });

    flow.addElement({
      "element": element,
      "propertyCategory": "plotArea"
    });
    sap.viz.extapi.Flow.registerFlow(flow);
  };

  flowRegisterFunc.id = "sap.viz.ext.stackedcolumnlinechart2";
  var flowDefinition =  {
    id: flowRegisterFunc.id,
    init: flowRegisterFunc
  };







  var vizExtImpl = {
    viz: [flowDefinition],
    module: [],
    feeds: [],
    cssString: ""
  };
  var vizExtBundle = sap.bi.framework.declareBundle({
    "id": "sap.viz.ext.stackedcolumnlinechart2",
    "version": "1.0.1",
    "components": [{
      "id": "sap.viz.ext.stackedcolumnlinechart2",
      "provide": "sap.viz.impls",
      "instance": vizExtImpl,
      "customProperties": {
        "name": "Bar Column with Line Chart",
        "description": "",
        "icon": {
          "path": ""
        },
        "category": [],
        "requires": [{
          "id": "sap.viz.common.core",
          "version": "5.14.0"
        }],
        "resources" : [ {
            "key" : "sap.viz.api.env.Template.loadPaths",
            "path" : "/resources/sap/viz/ext/stackedcolumnlinechart/src/resources/templates"
        }, {
            "key" : "sap.viz.api.env.Language.loadPaths",
            "path" : "./src/resources/languages"
        } ]
      }
    }]
  });
  // sap.bi.framework.getService is defined in BundleLoader, which is
  // always available at this timeframe
  // in standalone mode sap.viz.js will force load and active the
  // "sap.viz.aio" bundle
  if (sap.bi.framework.getService("sap.viz.aio", "sap.viz.extapi")) {
    // if in standalone mode, sap.viz.loadBundle will be available,
    // and we load the bundle directly
    return sap.bi.framework.getService("sap.viz.aio", "sap.viz.extapi").core.registerBundle(vizExtBundle);
  } else {
    // if loaded by extension framework, return the "sap.viz.impls"
    return vizExtBundle;
  }
};
