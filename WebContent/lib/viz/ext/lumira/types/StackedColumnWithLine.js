jQuery.sap.declare('sap.viz.ext.lumira.types.StackedColumnWithLine');

sap.viz.ext.lumira.types.StackedColumnWithLine = {};

sap.viz.ext.lumira.types.StackedColumnWithLine.init = function () {
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
    var minYValue = 0.001;

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

    var y = d3.scale.log()
      .rangeRound([height, minYValue]);

    var y2 = d3.scale.log()
      .rangeRound([height, minYValue]);

    //We use 20 colors by default for the stacked columns and value line. If there are more measures, adjust this line
    var color = d3.scale.ordinal().range(colorPalette);
    var xAxis = d3.svg.axis2()
      .scale(x)
      .orient("bottom");

    var yAxis = d3.svg.axis2()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".2s"))
      .tickSize(4);

    var y2Axis = d3.svg.axis2()
      .scale(y2)
      .orient("right")
      .tickSize(4,4)
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
      return key !== dimensionName && (valueLineMeasureName.indexOf(key) === -1 || y_measures.indexOf(key) >= 0);
    }));
    csvData.forEach(function(d) {
      var y0 = minYValue;
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
    y.domain([minYValue, 1.2 * d3.max(csvData, function(d) {
      return d.total;
    })]);
    y2.domain([minYValue, 1.2 * d3.max(csvData, function(d) {
      return d[valueLineMeasureName];
    })]);

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
      id: "sap.viz.ext.stackedcolumnlinechart",
      name: "Stacked Column with Line Chart",
      dataModel: "sap.viz.api.data.CrosstableDataset",
      type: "BorderSVGFlow"
    });

    var element = sap.viz.extapi.Flow.createElement({
      id: "sap.viz.ext.stackedcolumnlinechart.PlotModule",
      name: "Stacked Column with Line Chart Module"
    });
    element.implement("sap.viz.elements.common.BaseGraphic", moduleFunc);

    /*Feeds Definition*/
    var ds1 = {
      "id": "sap.viz.ext.stackedcolumnlinechart.PlotModule.DS1",
      "name": "X Axis",
      "type": "Dimension",
      "min": 0, //minimum number of data container
      "max": 2, //maximum number of data container
      "aaIndex": 1
    };
    element.addFeed(ds1);

    var ms1 = {
      "id": "sap.viz.ext.stackedcolumnlinechart.PlotModule.MS1",
      "name": "Y Axis",
      "type": "Measure",
      "min": 0, //minimum number of measures
      "max": Infinity, //maximum number of measures
      "mgIndex": 1
    };
    element.addFeed(ms1);

    var ms2 = {
      "id": "sap.viz.ext.stackedcolumnlinechart.PlotModule.MS2",
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

  flowRegisterFunc.id = "sap.viz.ext.stackedcolumnlinechart";
  var flowDefinition =  {
    id: flowRegisterFunc.id,
    init: flowRegisterFunc
  };







  var vizExtImpl = {
    viz: [flowDefinition],
    module: [],
    feeds: [],
    cssString: ".viz-controls-common-analysisDraggable {}.viz-controls-common-analysisDraggingToken {    overflow: hidden;    cursor: move;    background: rgba(102, 102, 102, 0.6);    border-radius: 3px;    display: block;    font-weight: bold;    padding: 0px 3px 0px 4px;    height: 22px;    line-height: 22px;    width: 178px;    z-index: 999999;    border: 1px solid #333;    box-shadow: 1px 1px 5px 0px rgba(0, 0, 0, 0.3);}.viz-controls-common-analysisDraggingToken > span {    display: inline-block;    width: 160px;    margin-right: 2px;    color: #FFF !important;}.viz-controls-common-analysisDraggingToken-icon {    padding: 1px 6px;    float: right;    margin: 3px 0 0 0;    color: #333;    font: inherit;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;    vertical-align: baseline;    border-radius: 0;    border: 0;}.viz-controls-common-analysisDraggingToken-icon-dropAccepted {    background-position: -17px -163px;}.viz-controls-common-analysisDraggingToken-icon-dropAcceptedAsReplacement {    background-position: 0px -163px;}.viz-controls-common-analysisDraggingToken-icon-dropDenied {    background-position: -34px -163px;}.viz-controls-common-analysisDraggingToken-icon-dropAsTrash {    background-position: 0px -269px;}.viz-controls-common-analysisDraggingToken-warn {    font-weight: normal;    font-size: 14px;    color: #FFBD69;    float: left;    display: inline-block;    min-width: 178px;}.viz-controls-common-analysisDraggingToken-warn-text{    display: inline-block;    white-space: nowrap;    padding: 0px 4px 0px 4px;}.viz-controls-common-feedlist {    position: absolute;    width: auto;    z-index: 999999;}.viz-controls-common-feedlist-container {    position: absolute;    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);    border: 1px solid #DAD9D9;    background-color: #ffffff;}.viz-controls-common-feedlist-container-left {    -webkit-animation: viz-controls-common-feedlist_keyframes_left .5s ease-out;}@-webkit-keyframes viz-controls-common-feedlist_keyframes_left{    0% {opacity: 0; left: 12px}    100% {opacity: 1; left: 0px}}.viz-controls-common-feedlist-container-right {    -webkit-animation: viz-controls-common-feedlist_keyframes_right .5s ease-out;}@-webkit-keyframes viz-controls-common-feedlist_keyframes_right{    0% {opacity: 0; left: -12px}    100% {opacity: 1; left: 0px}}.viz-controls-common-feedlist-arrow {    background-color: #ffffff;    height: 32px;    width: 32px;    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);    border: 1px solid #DAD9D9;    position: absolute;    -webkit-transform: rotate(45deg);    -moz-transform: rotate(45deg);    -ms-transform: rotate(45deg);    -o-transform: rotate(45deg);    transform: rotate(45deg);}.viz-controls-common-feedlist-content {    position: absolute;    background-color: #ffffff;    padding-right: 2px;}.viz-controls-common-feedlist-content-header {    padding: 12px 0px 0px 12px;    font-weight: bold;    font-size: 12px;    overflow: hidden;    text-overflow: ellipsis;    white-space: nowrap;}.viz-controls-common-feedlist ul {    min-width: 340px;    min-height: 200px;    padding: 1px;    background-color: #ffffff;    list-style: none;    margin: 0px;    display: inline-block;    position: absolute;    overflow-x: hidden;}.viz-controls-common-feedlist li {    position: relative;    line-height: 12px;    cursor: pointer;    font-size: 12px;}.viz-controls-common-feedlist-li-button, .viz-controls-common-feedlist-li-hierarchy-indicator {    display: block;    float: right;    position: absolute;    top: 50%;    margin-top: -8px;    border: 1px solid transparent;    border-image-source: initial;    border-image-slice: initial;    border-image-width: initial;    border-image-outset: initial;    border-image-repeat: initial;}.viz-controls-common-feedlist-li-hierarchy-indicator {    left: 2px;}.viz-controls-common-feedlist-li-hierarchy-Icon {    background-position: 0px -220px;    cursor: default;}.viz-controls-common-feedlist-li-button {    right: 15px;    cursor: pointer;}.viz-controls-common-feedlist-li-button-offset {    right: 2px;}.viz-controls-common-feedlist-li-button-close {    background-color: #007CC0;}.viz-controls-common-feedlist li:first-child {    padding-top: 3px;}.viz-controls-common-feedlist li:last-child {    margin-bottom: 0px;}.viz-controls-common-feedlist-li-hierarchy-indicator-focus {    background-color: #007CC0;}.viz-controls-common-feedlist a, .viz-controls-common-feedlist span {    margin-left: 20px;    display: block;    padding: 6px 6px;    cursor: pointer;    width: 260px;}.viz-controls-common-feedlist span {    padding-left: 45px;}.viz-controls-common-feedlist-li-a_suffix:after {    content: attr(__suffix);    position: relative;    margin-left: 8px;    line-height: 14px;    top: 2px;    background-color: #f2f2f2;    border-radius: 3px;    padding: 0 4px;    vertical-align: top;    display: inline-block;    max-width: 100%;    color: #666666;    font-size: 11px;    font-weight: bold;}.viz-controls-common-feedlist-li-plus-icon {    background-position: 0px -1118px;}.viz-controls-common-feedlist-li-minus-icon {    background-position: -51px -1118px;}/*.viz-controls-common-feedlist-content > ul > li:hover, .viz-controls-common-feedlist-content > ul > li:focus {    background-color: #e5f2f9;}*//*.viz-controls-common-feedlist-content > ul > li:hover .viz-controls-common-feedlist-li-hierarchy-Icon {    background-position: -17px -220px;}*/.viz-controls-common-hide-cursor {    cursor: none;    pointer-events: none;}.viz-controls-common-feedlist-li-highlight {    background-color: #e5f2f9;}.viz-controls-common-feedlist-li-icon-container {    position: absolute;    top: 4px;}.viz-controls-common-feeding-view {    width: 222px;}.viz-controls-common-feeding-item {    margin-bottom: 12px;    position: relative;}.viz-controls-common-feeding-item-title {    margin-bottom: 2px;    font-size: 12px;    cursor:default;}.viz-controls-common-feeding-item-content {    position: relative;}.viz-controls-common-feeding-item-list {    background-color: #ffffff;    border-color: #dddddd;    border-style: solid;    border-width: 1px;    padding: 3px 3px;    cursor: pointer;    margin: 0 30px 0 3px;}.viz-controls-common-feeding-item-list_active {    border-color: #007CC0;}.viz-controls-common-feeding-item-ph {    height: 24px;    position: relative;}.viz-controls-common-feeding-item-ph-half {    height: 12px;}.viz-controls-common-feeding-item-ph-text {    line-height: 24px;    display: inline-block;    font-family:Arial;    font-size: 12px;    text-overflow: ellipsis;    white-space: nowrap;    overflow: hidden;    width: 100%;    color: #DDDDDC;    margin: 0 0 0 4px;}.viz-controls-common-feeding-item-add-icon {    background-position: 0px -1417px;    position: absolute;    top: 8px;    right: 9px;    cursor: pointer;}.viz-controls-common-feeding-item-add-icon_active {    background-position: -17px -1417px;}.viz-controls-common-feeding-card {    margin-bottom: 4px;    padding: 0px 3px 0px 4px;    display: block;    position: relative;    color: #FFFFFF;    background-color: #666666;    background: #666666;    border: 1px solid #333;    border-radius: 3px;    font-weight: bold;    overflow: hidden;    cursor: move;    pointer-events: auto;}.viz-controls-common-feeding-card:last-of-type {    margin-bottom: 0px;}.viz-controls-common-feeding-card-text {    line-height: 22px;    padding: 0 2px 0 0;    font-size: 12px;    font-weight: bold;    margin-right: 2px;}.viz-controls-common-feeding-card:hover .viz-controls-common-feeding-card-text-with-icon-1 {    padding: 0 22px 0 0;}.viz-controls-common-feeding-card:hover .viz-controls-common-feeding-card-text-with-icon-2 {    padding: 0 44px 0 0;}.viz-controls-common-feeding-card-icon {    float: left;    margin: 3px 2px 0px 2px;}.viz-controls-common-feeding-hierarchy-card-icon {    background-position: -18px -220px;}.viz-controls-common-feeding-action-icon-measure {    visibility: hidden;    opacity: 0;    -webkit-transition-duration: .2s;    transition-duration: .2s;    position: absolute;    top: 3px;    right: 2px;    background-position: -51px -303px;    cursor: pointer;}.viz-controls-common-feeding-action-icon-hierarchy {    visibility: hidden;    opacity: 0;    -webkit-transition-duration: .2s;    transition-duration: .2s;    position: absolute;    top: 3px;    right: 2px;    background-position: 0px 0px;    cursor: pointer;}.viz-controls-common-feeding-action-icon-div {    position: absolute;    top: 0px;    right: 20px;    cursor: pointer;}.viz-controls-common-feeding-card-measure:hover .viz-controls-common-feeding-action-icon-measure{    visibility: visible;    opacity: 1;}.viz-controls-common-feeding-card-hierarchy:hover .viz-controls-common-feeding-action-icon-hierarchy{    visibility: visible;    opacity: 1;}.viz-controls-common-feeding-card-operation-div {    position: absolute;    top: 0px;    right: 0px;    cursor: pointer;}.viz-controls-common-feeding-card-operation {    visibility: hidden;    opacity: 0;    position: absolute;    -webkit-transition-duration: .2s;    transition-duration: .2s;    top: 3px;    right: 2px;    color: #333;    font: inherit;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;    vertical-align: baseline;    border-radius: 0;    border: 0;    background-position: 0px -269px;    cursor: pointer;}.viz-controls-common-feeding-card:hover .viz-controls-common-feeding-card-operation {    visibility: visible;    opacity: 1;}.viz-controls-common-feeding-card_draggingHelper {    transform: rotate(0deg);    -webkit-transform: rotate(0deg);    box-shadow: 2px 2px 1px 1px #444;    -webkit-box-shadow: 2px 2px 1px 1px #444;}.viz-controls-common-feeding-card_draggingHelper_grabbing {    cursor: -webkit-grabbing;}.viz-controls-common-feeding-card_draggingHelper_noDrop {}.viz-controls-common-feeding-card-ghost {    background: #e5e5e5;    border: 0;    font-weight: bold;    color: #666666;    padding: 0 4px 0 5px;}.viz-controls-common-feeding-drop-indicator {    background-color: #74b6e2;    border: 0;    position: absolute;    margin: -4px 0 0 -4px;    height: 4px;    width: 185px;}.viz-controls-common-menu {    position: absolute;    z-index: 999999;}.viz-controls-common-menu-transition {    -webkit-transition-duration: .24s;    transition-duration: .24s;    -webkit-transition-timing-function: ease-out;    transition-timing-function: ease-out;}.viz-controls-common-menu-list {    box-shadow: 1px 3px 5px rgba(0, 0, 0, .5);    border: 1px solid #7f7f7f;    background-color: #ffffff;    max-height: 264px;    overflow-x: hidden !important;}.viz-controls-common-menu-list > ul {    min-width: 178px;    max-width: 365px;    background-color: #ffffff;    list-style: none;    display: inline-block;    padding-left: 0px;    margin:0px 0px 4px 0px;}.viz-controls-common-menu-list > ul > li {    cursor: default;    padding: 6px 10px;    position: relative;    line-height: 12px;    height: 12px;    font-size: 12px;    margin: 4px 0px;}.viz-controls-common-menu-list > ul > li:last-child {    margin-bottom: 0px;}.viz-controls-common-menu-list-hovered {   background-color: #e5f2f9;}.viz-controls-common-menu-list-prefix-icon-x1 {    padding-left: 22px !important;}.viz-controls-common-menu-list-suffix-icon-x1 {    padding-right: 33px !important;}.viz-controls-common-menu-list-suffix-icon-submenu {    position: absolute;    right: 9px;    top: 4px;    background-position: -119px -362px;}/*.viz-controls-common-menu-list-hovered .viz-controls-common-menu-list-suffix-icon-submenu {    background-position: -102px -362px;}*/.viz-controls-common-menu-list-selected:before {    background-image: url('../common/assets/UVB_SharedSprite2.png');    background-color: transparent;    background-repeat: no-repeat;    background-position: 0px -207px;    width: 10px;    height: 10px;    content: ' ';    position: absolute;    overflow: hidden;    top: 50%;    margin-top: -5px;    left: 6px;}/*.viz-controls-common-menu-list-hovered:before {    background-position: -11px -207px;}*/.viz-controls-common-menu-list-caption {}.viz-controls-common-menu-list-group-splitter {    border-style: solid;    border-width: 1px 0px 0px 0px;    border-color: #ccc;    width: 90%;    margin: 0px auto;}.viz-controls-common-text-ellipsis {    overflow: hidden;    text-overflow: ellipsis;    white-space: nowrap;}.viz-controls-common-havanaVXTabSprite16 {    background-image: url('../common/assets/UVB_VxtabSprite.png');    background-color: transparent;    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-common-havanaVXTabSprite16-mask {    -webkit-mask-image: url('../common/assets/UVB_VxtabSprite.png');    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-common-havanaSharedSprite16 {    background-image: url('../common/assets/UVB_SharedSprite2.png');    background-color: transparent;    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-common-UVBSharedSprite {    background-image: url('../common/assets/UVB_SharedSprite.png');    background-color: transparent;    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-common-havanaSharedSprite16-mask {    background-image: url('../common/assets/UVB_SharedSprite2.png');    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-common-havanaVXTabSprite24 {    background-image: url('../common/assets/UVB_VxtabSprite.png');    background-color: transparent;    background-repeat: no-repeat;    width: 24px;    height: 24px;}.viz-controls-common-geography {    background-image: url('../common/assets/UVB_SharedSprite.png');    background-color: transparent;    background-repeat: no-repeat;    width: 16px;    height: 16px;    background-position: 0px -101px;}.viz-controls-common-popUp {    box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.5);    -webkit-box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.5);    -moz-box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.5);    z-index: 999999;}@-webkit-keyframes vizControls-common-blur_keyframes{0% {-webkit-filter: blur(0px);}100% {-webkit-filter: blur(4px);}}.viz-controls-common-blur {    -webkit-animation: vizControls-common-blur_keyframes .3s ease-out forwards;    /* filter: blur(4px);     -o-filter: blur(4px);     -ms-filter: blur(4px);     -moz-filter: blur(4px);     -webkit-filter: blur(4px);*/}.viz-controls-common-button-cancel:hover {    color: #007cc0;}.viz-controls-common-button {    border: 1px solid #BFBFBF;    cursor: pointer;    background: #FFFFFF;    /* used for disabled, hover and active states */}.viz-controls-common-button:hover {    border: 1px solid #BFBFBF;    background: #E5F2F9;}.viz-controls-common-button:active {    border: 1px solid #007CC0;    background: #007CC0;    color: #FFFFFF;}.viz-controls-common-scrollable-x {    overflow-x: auto !important;}.viz-controls-common-scrollable-y {    overflow-y: auto !important;}.viz-controls-builder-view-list {    min-height: 600px;}.viz-controls-builder-area {    min-width: 181px;    font: 14px 'Helvetica Neue', Arial, Helvetica, sans-serif;    color: #585858;    background-color: #f2f2f2;    border: 1px solid #dddddd;    border-width: 1px 0px 0px 0px;    overflow-x: hidden;}.viz-controls-builder-view-header {    background-color: #f2f2f2;    border-bottom: 1px solid #dddddd;    font-family: Verdana;    font-weight: bold;    font-size: 14px;    padding-bottom: 2px;    line-height: 36px;    padding-left: 19px;    cursor:default;}.viz-controls-builder-view-item {    margin: 0px 8px 0px 8px;}.viz-controls-builder-switcher-container {    padding-top: 10px;    width: 222px;    padding-left: 19px;}.viz-controls-builder-header {    margin-bottom: 10px;}.viz-controls-builder-header-text {    font-size: 12px;    font-weight: bold;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    cursor:default;    margin-right: 5px;}.viz-controls-builder-header-value {    font-weight: normal;    font-size: 12px;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    cursor:default;}.viz-controls-annotation-confirmdialog {    position: absolute;    /*width: 400px;     height: 200px;*/    display: inline-block;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    box-sizing: border-box;    overflow: hidden;    background-color: white;    border: 1px solid #96A8C3;    -moz-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    -webkit-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    z-index: 28;}.viz-controls-annotation-confirmdialog-header {    background-color: white;    background-repeat: repeat-x;    border-color: #E5EAF3 white;    border-style: solid;    border-width: 1px 1px 0;    margin: 0;    height: 19px;    color: black;    padding-top: 6px;    cursor: move;    overflow: hidden;    -moz-user-select: none;    -webkit-user-select: none;}.viz-controls-annotation-confirmdialog-headerleft {    font-weight: bold;    display: inline-block;    overflow: hidden;    white-space: nowrap;    padding-right: 20px;    text-overflow: ellipsis;    width: 100%;    -moz-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-annotation-confirmdialog-headerleft-label {    font-weight: bold;    white-space: nowrap;    margin: 6px 4px 0 20px;    color: black;    cursor: move;}.viz-controls-annotation-confirmdialog-headerright {    position: absolute;    right: 6px;    top: 1px;    padding-left: 5px;}.viz-controls-annotation-confirmdialog-headerright-close:hover, .viz-controls-annotation-confirmdialog-headerright-close:focus, .viz-controls-annotation-confirmdialog-headerright-close:active {    background-image: url(../controls/annotation/assets/DlgCloseHov_n.gif);    pointer-events: auto;}.viz-controls-annotation-confirmdialog-headerright-close {    width: 18px;    height: 18px;    background-image: url(../controls/annotation/assets/DlgClose_n.gif);    display: inline-block;    margin: 5px 1px 0 0;    cursor: pointer;    color: transparent;    pointer-events: auto;}.viz-controls-annotation-confirmdialog-content {    background-color: white;    border-color: white;    padding: 10px 20px 10px;    top: 0;    left: 0;    right: 0;    bottom: 0;    border-width: 0 1px;    border-style: solid;    overflow: hidden;}.viz-controls-annotation-confirmdialog-content-up {    background-color: white;    border-color: white;    top: 0;    left: 0;    width: 100%;    height: 40px;    border-width: 0 1px;    border-style: solid;    overflow: hidden;}.viz-controls-annotation-confirmdialog-content-down {    background-color: white;    border-color: white;    top: 40px;    left: 0;    width: 100%;    height: 30px;    border-width: 0 1px;    border-style: solid;    overflow: hidden;}.viz-controls-annotation-confirmdialog-content-icon {    width: 32px;    height: 32px;    background-image: url('../controls/annotation/assets/warning.png');    display: inline-block;    /*margin: 5px 1px 0 0;*/    cursor: pointer;    color: transparent;    /*padding-right: 2px;*/    vertical-align: top;    overflow: hidden;    outline: none;    position: relative;    float: left;}.viz-controls-annotation-confirmdialog-content-info {    font-weight: bold;    white-space: nowrap;    margin: 6px 4px 0 20px;    color: black;    cursor: move;    /*padding-left: 6px;*/    padding-right: 7px;    vertical-align: top;    overflow: hidden;    float: left;    text-align: left;    position: relative;}.viz-controls-annotation-confirmdialog-content-checkbox {    display: inline-block;    margin: 5px 1px 0 58px;    cursor: pointer;    color: transparent;    padding-right: 2px;    vertical-align: top;    overflow: hidden;    outline: none;    position: relative;    float: left;    pointer-events: auto;}.viz-controls-annotation-confirmdialog-content-checkboxlabel {    font-weight: bold;    white-space: nowrap;    margin: 4px 4px 0 4px;    color: black;    cursor: move;    padding-left: 6px;    padding-right: 7px;    vertical-align: top;    overflow: hidden;    float: left;    text-align: left;    position: relative;}.viz-controls-annotation-confirmdialog-footer {    background-color: white;    border: 1px solid white;    border-top-width: 0;    left: 0;    right: 0;    bottom: 0;    height: 43px;}.viz-controls-annotation-confirmdialog-footer-buttons {    padding-top: 4px;    margin: auto;    width: 200px;    white-space: nowrap;}.viz-controls-annotation-confirmdialog-footer-button {    width: 80px;    height: 28px;    margin: 0px 10px;    padding: 1px 6px;    pointer-events: auto;    outline: none;}.viz-controls-annotation-richtextdialog {    position: absolute;    display: inline-block;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    box-sizing: border-box;    overflow: hidden;    background-color: #E5EAF3;    border: 1px solid #007cc0;    -moz-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    -webkit-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    z-index: 30;}.viz-controls-annotation-richtextdialog-header {    background-color: white;    background-repeat: repeat-x;    border-color: #E5EAF3 white;    border-style: solid;    border-width: 1px 1px 0;    margin: 0;    height: 19px;    color: black;    padding-top: 6px;    cursor: move;    overflow: hidden;    -moz-user-select: none;    -webkit-user-select: none;}.viz-controls-annotation-richtextdialog-headerleft {    font-weight: bold;    display: inline-block;    overflow: hidden;    white-space: nowrap;    padding-right: 20px;    text-overflow: ellipsis;    width: 100%;    -moz-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-annotation-richtextdialog-headerleft-label {    font-weight: bold;    white-space: nowrap;    margin: 6px 4px 0 20px;    color: black;    cursor: move;}.viz-controls-annotation-richtextdialog-headerright {    position: absolute;    right: 6px;    top: 1px;    padding-left: 5px;}.viz-controls-annotation-richtextdialog-headerright-close:hover, .viz-controls-annotation-richtextdialog-headerright-close:focus, .viz-controls-annotation-richtextdialog-headerright-close:active {    background-image: url('../controls/annotation/assets/DlgCloseHov_n.gif');}.viz-controls-annotation-richtextdialog-headerright-close {    width: 18px;    height: 18px;    background-image: url('../controls/annotation/assets/DlgClose_n.gif');    display: inline-block;    margin: 5px 1px 0 0;    cursor: pointer;    color: transparent;}.viz-controls-annotation-richtextdialog-content {    background-color: white;    border-color: white;    padding: 10px 20px 10px;    top: 0;    left: 0;    right: 0;    bottom: 0;    border-width: 0 1px;    border-style: solid;    overflow: auto;}.viz-controls-annotation-richtextdialog-footer {    background-color: white;    border: 1px solid white;    border-top-width: 0;    left: 0;    right: 0;    bottom: 0;    height: 36px;}.viz-controls-annotation-richtextdialog-footer-buttons {    display: inline-block;    float: right;    padding-right: 14px;    white-space: nowrap;}.viz-controls-annotation-block-layer {    background-color: white;    opacity: 0.6;    filter: alpha(opacity=60);    top: 0;    left: 0;    right: 0;    bottom: 0;    position: fixed;    outline: 0 none;    z-index: 28;}.viz-controls-annotation-button {    vertical-align: top;    padding: 0 5px;    margin: 0 5px;    overflow: visible;    white-space: nowrap;    outline: none;    background-repeat: repeat-x;    width: 80px;    height: 28px;}.viz-controls-chart-area {    width: 100%;    height: 100%;    background-color: #FAFAFA;    min-width: 300px;    position: relative;    z-index: 1;}.viz-controls-chart-loading-icon {    background-image: url('../common/assets/ajax-loader.gif');    display: none;    position: absolute;    background-repeat: no-repeat;    background-position: center center;    top: 0px;}.viz-controls-chart-property-zone {    position:absolute;    cursor: pointer;}.viz-controls-chart-property-zone:hover {    background-color:#DDDDDD;    opacity: 0.3;}.viz-controls-chart-property-zone-selected {    border: 1px solid #007CC0;    background-color:#DDDDDD;    opacity: 0.3;}.viz-controls-chart-drop-zone {    position:absolute;    border:1px solid #007CC0;    color:#007CC0;    cursor: pointer;}.viz-controls-chart-title-button {    float: right;    width:16px;    height:16px;    border-width: 0px;    background-color: transparent;    overflow: hidden;    text-overflow: ellipsis;    white-space: nowrap;}.viz-controls-chart-title-text{    float:left;    position: absolute;    width: 100%;    height: 100%;    background-image:none !important;    background:transparent;    border-style:none;    font-size:16px;    font-weight:bold;    outline:0;    border: none;    text-align:center;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    white-space: nowrap;    text-overflow: ellipsis;    display: none;}.viz-controls-chart-setting-icon{    background-position: -18px 0px;    cursor: pointer;    padding: 1px;    position:absolute;    cursor: pointer;    margin-left: 5px;}.viz-controls-chart-setting-icon:hover {    background-position: 0px -248px;}.viz-controls-chart-title-edit{   border: 1px solid #007CC0;   background-color: #FAFAFA;}.viz-controls-chart-block-layer {    background-color: white;    opacity: 0.6;    filter: alpha(opacity=60);    top: 0;    left: 0;    right: 0;    bottom: 0;    position: fixed;    outline: 0 none;    z-index: 28;}.viz-controls-chart-editaxis {    position: absolute;    width: 280;    padding: 16px;    display: inline-block;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    box-sizing: border-box;    overflow: hidden;    background-color: white;    border: 1px solid #96A8C3;    -moz-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    -webkit-box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    box-shadow: inset 0 0 1px 1px #ffffff, 5px 5px 10px rgba(0,0,0,0.5);    z-index: 28;    font-family : Helvetica Neue, Arial,Helvetica, sans-serif;    font-size: 12px;    color: #585858;}.viz-controls-chart-editaxis-separator {    border-bottom: solid 1px #dddddd;    width: 100%;    margin-bottom:8px;}.viz-controls-chart-editaxis-footer {    left: 0;    right: 0;    bottom: 0;    height: 30px;}.viz-controls-chart-editaxis-footer-buttons {    margin: auto;    width: 200px;    white-space: nowrap;}.viz-controls-chart-editaxis-footer-button {    width: 80px;    height: 28px;    margin: 0px 10px;    padding: 1px 6px;    outline: none;}.viz-controls-chart-editaxis-axiscontainer {    margin-bottom : 24px;}.viz-controls-chart-editaxis-axisname {    margin-bottom : 4px;}.viz-controls-chart-editaxis-inputs {    margin-left : 20px;}.viz-controls-chart-editaxis-inputvalue {    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    font-size : 12px;    width: 100px;    height : 22px;}.viz-controls-chart-editaxis-inputvalue:disabled {    color: #a9a9a9;}.viz-controls-chart-axissplitter-axis {    position: absolute;    width : 6px;    height: 6px;}.viz-controls-chart-axissplitter-resizehelper-mask {    position: absolute;    z-index:99;    top: 0;    left: 0;    width: 100%;    height: 100%;    opacity: 0.1;}.viz-controls-chart-axissplitter-resizehelper {    position: absolute;    border : 1px dashed #007dc3;    overflow: hidden;    z-index: 99;}.viz-controls-chart-warning {    position: absolute;    width: 368px;    height: 98px;    display: inline-block;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    box-sizing: border-box;    overflow: hidden;    border: 1px solid #1381D2;    z-index: 28;    font-family: Helvetica, Arial;}.viz-controls-chart-warning-title {    position: absolute;    width: 100%;    height: 45px;    background: white;}.viz-controls-chart-warning-title-icon {    background-image: url('../controls/chart/assets/warning.png');    position: absolute;    margin: 16px 8px 14px 19px;    width: 16px;    height: 16px;}.viz-controls-chart-warning-title-text {    position: absolute;    font-size: 13px;    padding: 16px 0px 14px 43px;}.viz-controls-chart-warning-info {    position: absolute;    width: 100%;    height: 50px;    top: 45px;    background: #FAFAFA;}.viz-controls-chart-warning-info-text {    position: absolute;    font-size: 11px;    padding: 10px 15px 0px 15px;}.viz-controls-chart-warning-delete-icon {    position: absolute;    background-position: 0px -34px;    cursor: pointer;    top: 2px;    right: 1px;    margin: 6px 6px 0px 0px;}.viz-controls-chart-warning-separator {    position: absolute;    border-bottom: solid 1px #dddddd;    width: 100%;    margin-top:45px;}.viz-controls-chart-map-esri-relogon{    position: absolute;    width: 28px;    height: 28px;}.viz-controls-chart-map-no-service {    position: absolute;    background-color:#ffffff;    width: 291px;    height: 92px;    border: solid 2px #007cc0} .viz-controls-chart-map-service-no-service-title{    width  :   276px;    height :   34px;    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    font-size : 13px;    color:#424242;    padding-left: 15px;    padding-top:12px}.viz-controls-chart-map-service-no-serive-message {    width  :   276px;    height :   31px;    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    font-size : 13px;    color:#424242;    padding-left: 15px;    padding-top: 15px;    background-color: #fAfAfA;    border-top: solid 1px #F2F2F2     }.viz-controls-chart-map-service-selector {    position: absolute;    background-color:#ffffff;    width: 291px;    height: 300px;    border: solid 2px #007cc0}.viz-controls-chart-map-service-selector-title{    width  :   276px;    height :   46px;    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    font-size : 13px;    line-height: 46px;    color:#424242;    padding-left: 15px;    border-bottom: solid 1px #F2F2F2 }.viz-controls-chart-map-service-selector-footer{    width  :   261px;    height :   46px;    bottom :   0px;    position:  absolute;    border-top: solid 1px #F2F2F2     margin-left:15px;    margin-right:15px;}.viz-controls-chart-map-service-selector-services-gallery{   margin:0 0 0 2px;   width: 100%;   background-color: #fAfAfA;   border-top:1px solid #F2F2F2;   broder-bottom:1px solid #f2f2f2;   padding-left:7.5px;   padding-right:7.5px;   height: 100%;}.viz-controls-chart-map-service-selector-services-color-panel{   padding-left:15px;   padding-right:15px;   font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    font-size : 10px;}.viz-controls-chart-map-service-selector-services-color-title-group {  width:243px;  height:15px;}.viz-controls-chart-map-service-selector-services-color-title-label{ width:150px; height:15px;    text-align:left;   font-size : 10px;   float:left;}.viz-controls-chart-map-service-selector-services-color-reset{    background-color : #f7f7f7;    width:  90px;    height: 15px;     text-align:right;    font-size : 10px;     float:right;     color: blue;}.viz-controls-chart-map-service-selector-services-color-reset:hover{    cursor: pointer;}.viz-controls-chart-map-service-selector-services-gallery-close{    position: absolute;    right: 0px;    top: 0px;    margin: 2px;    width: 24px;    height: 24px;    background-image: url('../controls/chart/assets/close.png');}.viz-controls-chart-map-service-selector-services-gallery-close:hover{    cursor: pointer;}.viz-controls-chart-map-service-selector-services-item{   float:     left;   height:    78px;   width:     87px;   overflow:  hidden;}.viz-controls-chart-map-service-selector-services-item-icon{      height:   48px;    width:    72px;    overflow: hidden;    background-color: #f7f7f7;    background-repeat: round;    background-size:  contain;    border:    2px solid #fff;}.viz-controls-chart-map-service-selector-services-item-title {    height:  15px;    width:   72px;     line-height: 30px;    text-align:left;    font-size:10px;    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;       font-color: #666666;}.viz-controls-chart-map-service-selector-services-item-icon:hover{    border-color:#0091d9;    border-style: solid;     border-width: 2px;    box-sizing: content-box; }.viz-controls-chart-map-service-selector-services-item-icon-selected{    border-color:#0091d9;    border-style: solid;     border-width: 2px;    box-sizing: content-box; }.viz-controls-chart-map-service-selector-button-layer{ display: inline-block;    background-color : #f7f7f7;    float: left;    width:  80px;    height: 28px;     border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    text-align:center;    line-height:28px; margin-left:15px;}.viz-controls-chart-map-service-selector-button-layer:hover{    background-color : #007cc0;    cursor: pointer;    color:white;}.viz-controls-chart-map-service-selector-button-confirm{    display: inline-block;    background-color : #f7f7f7;    float: right;    width:  80px;    height: 28px;     line-height:28px;    border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    text-align:center;}.viz-controls-chart-map-service-selector-button-confirm:hover{    background-color : #007cc0;    cursor: pointer;    color: white;}.viz-controls-chart-map-service-selector-button-done{    display: inline-block;    background-color : #f7f7f7;    float: right;    width:  80px;    height: 28px;     line-height:28px;    border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    text-align:center;}.viz-controls-chart-map-service-selector-button-done:hover{    background-color : #007cc0;    cursor: pointer;    color: white;}.viz-controls-chart-map-service-selector-services-panel{    overflow-y: auto;    overflow-x: hidden;    width: 283.5px; padding-left:7.5px;    background-color : #f7f7f7;    min-height:198px;    max-height:198px;}.viz-controls-chart-map-service-selector-services-color-radio-group {  height:15px;}.viz-controls-chart-map-service-selector-services-color{    overflow-y: auto;    overflow-x: hidden;    width: 100%;    background-color : #f7f7f7;}.viz-controls-chart-map-service-selector-services-color-field-gradient-start{  font-family : Helvetica Neue, Arial, Helvetica, sans-serif;   position : inline-block;  margin-top: 5px;}.viz-controls-chart-map-service-selector-services-color-field-gradient-end{  font-family : Helvetica Neue, Arial, Helvetica, sans-serif;   position : inline-block;  margin-top: 5px;}.viz-controls-chart-map-service-selector-services-color-field-title{    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;     margin-top:10px;}.viz-controls-chart-map-service-selector-services-color-field-selector{    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    margin-bottom: 10px;}.viz-controls-chart-map-service-selector-services-color-field-gradient-value-group1{  width:100%;  height:30px;  margin-top:5px;}.viz-controls-chart-map-service-selector-services-color-field-gradient-value-group2{  margin-top:5px;  width:100%;  height:25px;}.viz-controls-chart-map-service-selector-services-color-field-gradient-colorpicker{    display: inline-block;    left:80px;    margin-top:7px;    margin-left:6px;    top:8px;    height:8px;    width:8px;    border:1px solid #666666;   float:left}.viz-controls-chart-map-service-selector-services-color-field-gradient{    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    width: 100%;}.viz-controls-chart-map-service-selector-services-color-field-gradient-value{    font-family : Helvetica Neue, Arial, Helvetica, sans-serif;    width: 70px;    display: inline-block;    left:0px;    top:0px;    float:left;}.viz-controls-chart-axis-dialog-close {    position: absolute;    cursor: pointer;    border-style:none;    border-width:0px;    width: 24px;    height: 24px;    background-position: 0px -991px;    background-image: url('../common/assets/UVB_SharedSprite2.png');}.viz-controls-chart-axis-dialog-close:hover {    background-position: -25px -991px;}.viz-controls-contextmenu {    position: fixed;    z-index: 999999;    top: -10000px;    display: block;    min-width: 80px;    border: 1px solid #BFBFBF;    background-color: white;    cursor: default;    outline: none;    overflow: hidden;    padding: 1px;    box-shadow: 2px 2px 3px rgba(198,198,198,0.5);    -webkit-box-shadow: 2px 2px 3px rgba(198,198,198,0.5);    -moz-box-shadow: 2px 2px 3px rgba(198,198,198,0.5);}.viz-controls-contextmenu-list {    padding: 0;    margin: 0;    display: block;    cursor: default;    color: #585858;    font-size: 12px;    font-family: Tahoma, Arial, Helvetica, sans-serif;}.viz-controls-contextmenu-list > li {    margin: 4px 0px;    background-color: #ffffff;}.viz-controls-contextmenu-list-hovered > li:hover,.viz-controls-contextmenu-list li.viz-controls-contextmenu-MnuItmOpen {    background-color: #e5f2f9;}.viz-controls-contextmenu-list-hovered .viz-controls-contextmenu-disabled:hover {    background-color: inherit;}.viz-controls-contextmenu-disabled .viz-controls-contextmenu-MnuItmTxt {    color: #bfbfbf;}.viz-controls-contextmenu-MnuItm {    display: block;    height: 23px;    line-height: 21.5px;    white-space: nowrap;    position: relative;    text-align: left;}.viz-controls-contextmenu-MnuItmTxt {    color: #585858;    padding-left: 6px;    padding-right: 30px;    vertical-align: top;    overflow: hidden;    white-space: nowrap;    height: 100%;    position: relative;    display: inline-block;    pointer-events: none;}.viz-controls-contextmenu-MnuItmIco {    padding-right: 2px;    width: 20px;    vertical-align: top;    display: inline-block;    overflow: hidden;    outline: none;    height: 100%;    position: relative;    pointer-events: none;}.viz-controls-contextmenu-MnuItmTooltip {    opacity: 0;    border: 1px solid #BFBFBF;    background-color: #F2F2F2;    padding: 8px 16px;    z-index: 999999;    font-size: 12px;    width : 220px;    white-space: normal;    box-shadow: 2px 2px 3px rgba(198,198,198,0.5);    -webkit-box-shadow: 2px 2px 3px rgba(198,198,198,0.5);    -moz-box-shadow: 2px 2px 3px rgba(198,198,198,0.5);}.viz-controls-contextmenu-MnuItm-Show, .viz-controls-contextmenu-MnuItm-Hide {    padding-left:21px;}.viz-controls-contextmenu-MnuItmIco-Show:before {    background-position: 0px -207px;}.viz-controls-contextmenu-MnuItmIco-Hide:before {    background-position: -34px -207px;}.viz-controls-contextmenu-disabled:before {    opacity: .4;}.viz-controls-contextmenu-MnuItmIco-Show:before, .viz-controls-contextmenu-MnuItmIco-Hide:before {    background-image: url('../common/assets/UVB_SharedSprite2.png');    background-color: transparent;    background-repeat: no-repeat;    width: 10px;    height: 10px;    content: ' ';    position: absolute;    overflow: hidden;    top: 50%;    margin-top: -5px;    left: 9px;}.viz-controls-contextmenu-MnuItmIco-Show-Hovered:before {    background-position: -11px -207px;}.viz-controls-contextmenu-MnuItmIco > img {    max-width: 16px;    max-height: 16px;    padding-left: 6px;    vertical-align: middle;    pointer-events: none;}.viz-controls-contextmenu-blank-MnuItem {    display : block;    height : 21.5px;    line-height : 21.5px;    white-space : nowrap;    position : relative;    padding : 0px 10px;}.viz-controls-contextmenu-blank-MnuItmTxt {    color: #bfbfbf;}.viz-controls-contextmenu-MnuItem-separator {    border-bottom : 1px solid #e7e7e7;    width: 95%;    margin: 1px auto;}.viz-controls-custombutton-button {    min-width: 20px;    min-height: 20px;    float: right;    padding: 12px 3px 0px 0px;    border-width: 0px;    background-color: transparent;    overflow: hidden;    text-overflow: ellipsis;    white-space: nowrap;}.viz-controls-feeding-view {    min-width: 181px;    overflow-x: hidden;    padding-top: 5px;    padding-bottom: 1px;}.viz-controls-feeding-expand-icon {    float:left;    background-position: -17px -51px;    cursor: pointer;}.viz-controls-feeding-collapse-icon {    float:left;    background-position: -34px -51px;    cursor: pointer; }.viz-controls-feeding-title-with-icon {    margin-left: 0px;     padding-top:5px;}.viz-controls-feeding-title-without-icon {    margin-left: 16px;    padding-top:5px;}.viz-controls-feeding-title-text {    font-weight: bold;    font-size: 12px;    margin-left: 3px;}.viz-controls-feeding-separator {    border-style: solid;    border-width: 0px 0px 1px 0px;    border-color: #dddddd;    margin: 4px 8px 10px 19px;}.viz-controls-feeding-container {    display: inline-block;    min-height: 60px;    margin-left: 19px;}.viz-controls-frame-editor {    position: absolute;    width: 760px;    height: 460px;    -webkit-animation: vizControls-vizFrame-editor_keyframes .3s ease-out forwards;}@-webkit-keyframes vizControls-vizFrame-editor_keyframes{0% {opacity: 0;}100% {opacity: 1;}}.viz-controls-frame-editor-main {    height: 100%;    width: 100%;    position: relative;    border-style: solid;    border-width: 1px;    background-color: #ffffff;    padding: 12px;}.viz-controls-frame-editor-header {    width: 100%;    height: 40px;}.viz-controls-frame-editor-content {    width: 100%;    margin-bottom: 24px;}.viz-controls-frame-editor-content-img {    width: 100%;}.viz-controls-frame-editor-footer {    width: 100%;}.viz-controls-frame-editor-footer-button {    width: 80px;    height: 28px;    margin-right: 6px;}.viz-controls-frame-editor-close {    background-position: 0px -269px;    position: absolute;    right: 6px;    top: 6px;    cursor: pointer;}.viz-controls-frame-editor-close:hover {    opacity: .6;}.viz-controls-frame-area {    width: 100%;    height: 100%;    max-height: 100%;    background-color: #FAFAFA;    position: relative;    z-index: 1;}/*will be removed by title context menu*/.viz-controls-frame-MnuItm {    display: block;    height: 23px;    line-height: 21.5px;    white-space: nowrap;    position: relative;}.viz-controls-frame-MnuItmTxt {    color: #585858;    padding-left: 6px;    padding-right: 7px;    vertical-align: top;    overflow: hidden;    text-align: left;    white-space: nowrap;    height: 100%;    position: relative;    display: inline-block;    pointer-events: none;}.viz-controls-frame-MnuItmIco {    padding-right: 2px;    width: 20px;    vertical-align: top;    display: inline-block;    overflow: hidden;    outline: none;    height: 100%;    position: relative;    pointer-events: none;}.viz-controls-frame-MnuItm-Show, .viz-controls-frame-MnuItm-Hide {    padding-left:21px;}.viz-controls-frame-MnuItmIco-Show:before {    background-position: 0px -207px;}.viz-controls-frame-MnuItmIco-Hide:before {    background-position: -34px -207px;}.viz-controls-frame-MnuItmIco-Show:before, .viz-controls-frame-MnuItmIco-Hide:before {    background-image: url('../common/assets/UVB_SharedSprite2.png');    background-color: transparent;    background-repeat: no-repeat;    width: 10px;    height: 10px;    content: ' ';    position: absolute;    overflow: hidden;    top: 50%;    margin-top: -5px;    left: 9px;}.viz-controls-frame-MnuItmIco-Show-Hovered:before {    background-position: -11px -207px;}.viz-controls-frame-MnuItmIco > img {    max-width: 16px;    max-height: 16px;    padding-left: 6px;    vertical-align: middle;    pointer-events: none;}.viz-controls-frame-blank-MnuItem {    display : block;    height : 21.5px;    line-height : 21.5px;    white-space : nowrap;    position : relative;    padding : 0px 10px;}.viz-controls-frame-blank-MnuItmTxt {    color: #bfbfbf;}.viz-controls-frame-MnuItem-separator {    border-bottom : 1px solid #e7e7e7;    width: 95%;    margin: 1px auto;}.viz-controls-frame-header {    background-color: #FAFAFA;    font-size: 12px;    font-weight: normal;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    top: -1px;    border: 1px solid #DAD9D9;    min-height: 40px;    padding: 0px 0px 0px 0px;    min-width: 300px;    position: relative;}.viz-controls-frame-header-fullscreen-exit-icon {    background-position: -17px -17px;    cursor: pointer;    padding: 1px;}.viz-controls-frame-header-fullscreen-exit-icon:hover {    background-position: -19px -248px;}.viz-controls-frame-header-fullscreen-enter-icon {    background-position: 0px -17px;    cursor: pointer;    padding: 1px;}.viz-controls-frame-header-fullscreen-enter-icon:hover {    background-position: -38px -248px;}.viz-controls-frame-header-setting-icon {    background-position: -18px 0px;    cursor: pointer;    padding: 1px;}.viz-controls-frame-header-setting-icon:hover {    background-position: 0px -248px;    }.viz-controls-frame-header-filterbar-container {    background-color: #FAFAFA;    font-size: 12px;    font-weight: normal;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    float: left;    position: absolute;    left: 0px;    right: 60px;    min-height: 38px;    height:99%;    margin: 0px;    white-space: nowrap;}.viz-controls-frame-filtermenu {    visibility: hidden;    display: none;    z-index: 100;    position: absolute;    border: 1px solid #96a8c3;    background-color: #f2f2f2;    cursor: default;    outline: none;    overflow: hidden;    height: 40px;    padding-left: 10px;    padding-right: 10px;    box-shadow: 5px 5px 10px rgba(0,0,0,0.5);    -webkit-box-shadow: 5px 5px 10px rgba(0,0,0,0.5);    -moz-box-shadow: 5px 5px 10px rgba(0,0,0,0.5);}.viz-controls-frame-filtermenu > div {    float: left;    cursor: pointer;    height: 30px;    margin-right: 15px;    margin-top: 5px;}.viz-controls-frame-filtermenu > div:last-child {    margin-right: 0px;}.viz-controls-frame-filtermenu > div:hover {    background-color: #007CC0 ;    color: #ffffff;}.viz-controls-frame-filtermenu > div > div {    float: left;    margin: 8px 5px 8px 5px;}.viz-controls-frame-filtermenu > div > div:first-child {    margin: 8px 0px 0px 5px;}.viz-controls-frame-filtermenu-exclude-icon {    background-position: 0px -269px;}.viz-controls-frame-filtermenu > div:hover .viz-controls-frame-filtermenu-exclude-icon {    background-position: -17px -269px;}.viz-controls-frame-filtermenu-filter-icon {    background-position: 0px -286px;}.viz-controls-frame-filtermenu > div:hover .viz-controls-frame-filtermenu-filter-icon {    background-position: -17px -286px;}.viz-controls-frame-xlabel {    height: 30px;    visibility: hidden;}.viz-controls-frame-xlabel {    text-align: center;    line-height: 30px;}.viz-controls-frame-ylabel {    float: left;    width: 30px;    visibility: hidden;}.viz-controls-frame-ylabel-text {    text-align: center;    -webkit-transform: rotate(-90deg);    -moz-transform: rotate(-90deg);    -ms-transform: rotate(-90deg);    -o-transform: rotate(-90deg);    transform: rotate(-90deg);}.viz-controls-mapbuilder{    background: #f2f2f2;    color: #585858;    height: 100%;    width: 250px;    font: normal 14px 'Helvetica Neue', Helvetica, arial, sans-serif;}.viz-controls-mapbuilder-area{    padding-left: 5px;    padding-right: 10px;      height: 100%;  }.viz-controls-mapbuilder-section{    border-style: solid;    border-width: 1px;    border-color : #d8d8d8;    margin-bottom: 9px;    padding-left : 13px;    padding-right: 9px;}.viz-controls-mapbuilder-section-expand{    padding-bottom: 9px;}.viz-controls-mapbuilder-header{    height: 30px;    padding-left: 13px;}.viz-controls-mapbuilder-header-text{    display : inline-block;    width: auto;    max-width: 125px;    text-overflow: ellipsis;    cursor: pointer;    font: normal 12px 'Helvetica Neue', Helvetica, arial, sans-serif;    color: #008fd3;    position: relative;    top : 6px;    left : 5px;}.viz-controls-mapbuilder-footer{    height: 30px;    padding-left: 13px;    background-color: #F2F2F2;    width:230px;}.viz-controls-mapbuilder-footer-text{    display : inline-block;    width: auto;    height:15px;    text-overflow: ellipsis;    cursor: pointer;    font: normal 12px 'Helvetica Neue', Helvetica, arial, sans-serif;    color: #008fd3;    position: relative;    top : 6px;    left : 5px;}.viz-controls-mapbuilder-footer-radio{    display : inline-block;    float:left;    cursor: pointer;    left:-2px;    position: relative;    top:6px;}.viz-controls-mapbuilder-footer-radio-text{    display : inline-block;    float:left;    cursor: pointer;    position: relative;    font: normal 12px 'Helvetica Neue', Helvetica, arial, sans-serif;    color: #008fd3;    margin-left:1px;    top:6px;}.viz-controls-mapbuilder-footer-radio-text.disable{    color: #A6A6A6;    cursor: default;}.viz-controls-mapbuilder-header-plus{    background-image: url('../controls/mapbuilder/assets/add.png');    display : inline-block;    cursor: pointer;    width : 16px;    height: 16px;    position: relative;    top : 10px;}.viz-controls-mapbuilder-disable-header-plus{    background-image: url('../controls/mapbuilder/assets/disabled_add.png');    display : inline-block;    width : 16px;    height: 16px;    position: relative;    top : 10px;}.viz-controls-mapbuilder-section-header{    cursor: pointer;    height: 30px;    margin-top : 4px;    margin-bottom: 4px;}.viz-controls-mapbuilder-section-block{    display : inline-block;    vertical-align : top;    margin-top : 10px;    margin-bottom: 10px;    margin-left : 6px;    width : 14px;    height: 14px}.viz-controls-mapbuilder-section-category-title {    display: inline;    padding-bottom: 4px;    margin-top: 8px;}.viz-controls-mapbuilder-section-category-title-text {    display: inline;    font : 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: #585858;}.viz-controls-mapbuilder-chartType-icon-title {    display: inline;    padding-bottom: 4px;    margin-top: 8px;}.viz-controls-mapbuilder-chartType-icon-title-text {    display : inline;    font : 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: gray;}.viz-controls-mapbuilder-section-setting{    background-image: url('../controls/mapbuilder/assets/setting.png');    float: right;    background-repeat: no-repeat;    display : inline-block;    vertical-align : top;    margin-top : 8px;    margin-bottom: 4px;    margin-left : 4px;    width : 20px;    height: 20px}.viz-controls-mapbuilder-section-icon{    background-image: url('../controls/mapbuilder/assets/choropleth.png');    background-repeat: no-repeat;    display : inline-block;    vertical-align : top;    margin-top : 8px;    margin-bottom: 4px;    margin-left : 4px;    width : 16px;    height: 20px;}.viz-controls-mapbuilder-section-icon-choropleth{    background-image: url('../controls/mapbuilder/assets/choropleth.png');    background-repeat: no-repeat;    display : inline-block;    vertical-align : top;    margin-top : 8px;    margin-bottom: 4px;    margin-left : 4px;    width : 16px;    height: 20px;}.viz-controls-mapbuilder-section-icon-bubble{    background-image: url('../controls/mapbuilder/assets/bubble.png');    background-repeat: no-repeat;    display : inline-block;    vertical-align : top;    margin-top : 8px;    margin-bottom: 4px;    margin-left : 4px;    width : 16px;    height: 20px;}.viz-controls-mapbuilder-section-icon-marker{    background-image: url('../controls/mapbuilder/assets/marker.png');    background-repeat: no-repeat;    display : inline-block;    vertical-align : top;    margin-top : 8px;    margin-bottom: 4px;    margin-left : 4px;    width : 16px;    height: 20px;}.viz-controls-mapbuilder-section-header-expand{   padding-bottom : 12px;    }.viz-controls-mapbuilder-section-expand{    display : inline-block;    vertical-align : top;    margin-top : 14px;    margin-bottom: 4px;    margin-left : 4px;    width : 14px;    height: 14px }.viz-controls-mapbuilder-section-collapse{    display : inline-block;    vertical-align : top;    margin-top : 12px;    margin-bottom: 4px;    margin-left : 4px;    width : 14px;    height: 14px }.viz-controls-mapbuilder-section-title{    font : bold 13px Tahoma, Helvetica, Arial, sans-serif;     color: #333333;    height : 20px;    display : inline-block;    vertical-align : top;    margin-top : 9px;    margin-left : 4px;    width: auto;    max-width: 120px;    text-overflow: ellipsis;    white-space: nowrap;    overflow-x : hidden;    overflow-y: hidden}.viz-controls-mapbuilder-header-expand{    background-image: url('../controls/mapbuilder/assets/arrow_expand.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-header-collapse{    background-image: url('../controls/mapbuilder/assets/arrow_collapse.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-datapointchooser{    width: 100%;    margin-top: 8px;    margin-bottom: 12px;}.viz-controls-mapbuilder-datapointchooser .viz-controls-mapbuilder-section-title{    border-style: none;}.viz-controls-mapbuilder-inline-block{    display : inline-block;    position: relative;    top: 2px;}.viz-controls-mapbuilder-viztype{    margin-left: 4px;    width:  32px;    height: 32px;     border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    background: #f7f7f7;}.viz-controls-mapbuilder-viztype:hover {    border: 1px solid #BFBFBF;    background: #eaeaea;    cursor: pointer;}.viz-controls-mapbuilder-datapointchooser .viz-controls-mapbuilder-viztype-selected{      border: 1px solid #007cc0;    background: #007cc0;}.viz-controls-mapbuilder-viztype-selected:hover{      border: 1px solid #006ca7;    background: #006ca7;}.viz-controls-mapbuilder-viztype-icon {    width : 16px;    height: 16px;}.viz-controls-mapbuilder-viztype-choropleth{    background-image: url('../controls/mapbuilder/assets/choropleth.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-viztype-bubble{    background-image: url('../controls/mapbuilder/assets/bubble.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-viztype-marker{    background-image: url('../controls/mapbuilder/assets/marker.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-viztype-selected{    background-color: #007cc0;}.viz-controls-mapbuilder-viztype-selected .viz-controls-mapbuilder-viztype-icon{    background-position: -17px 0px;}.viz-controls-mapbuilder-section-container{    overflow-y: auto;    overflow-x: hidden;    bottom:30px;    height: calc(100% - 70px);}.viz-controls-mapbuilder-feeding-container {    display: inline-block;    min-height: 40px;    width: 222px;}.viz-controls-mapbuilder-contextmenu-container{    background-color: #FFFFFF;    width : 120px;    height : auto;    opacity: 0.9;    border: 1px solid #bfbfbf;    box-shadow: 1px 1px 5px 0px rgba(0, 0, 0, 0.3); }.viz-controls-mapbuilder-contextmenu{    height: auto;    width: 100%;    background-color: #FFFFFF;    list-style : none;    padding-left : 0px;    padding-top : 12px;    margin : 0px;}.viz-controls-mapbuilder-configmenu-container{    height: 75px;    width: 180px;    background-color: #f5f5f5;    list-style : none;    border-color:#bfbfbf;    border-style: solid;     border-width: 1px;    padding-left : 2px;    padding-top : 12px;    margin : 0px;    box-shadow: 1px 1px 5px 0px rgba(0, 0, 0, 0.3);}.viz-controls-mapbuilder-contextmenu li:hover{   cursor: pointer;   background-color: #e5f2f9;};.viz-controls-mapbuilder-menuitem{   height: 30px;}.viz-controls-mapbuilder-contextmenu-moveup{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/moveup.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-contextmenu-movedown{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/movedown.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-contextmenu-delete{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/delete.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-contextmenu-hide{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/hide.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-contextmenu-show{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/show.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-contextmenu-rename{    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/rename.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    margin-top: 5px;}.viz-controls-mapbuilder-menutext{    padding-left: 6px;    display :inline-block;    vertical-align: middle;    font: normal 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: #585858;    padding-top: 8px;    line-height: 0;    height: 16px;}.viz-controls-mapbuilder-menuitem:hover .viz-controls-mapbuilder-menutext{    color: #585858;     }.viz-controls-mapbuilder-contextmenu-action-name{   padding-left: 5px;   font: normal 12px 'Helvetica Neue', Helvetica, arial, sans-serif;}.viz-controls-mapbuilder-contextmenu-action-title{   display :inline-block;    padding-left: 5px;}.viz-controls-mapbuilder-contextmenu-action-warning{    position: relative;    width : 16px;    height: 16px;    background-image : url('../controls/mapbuilder/assets/alert.png');    background-repeat: no-repeat;    display :inline-block;    margin-left : 16px;    top: 2px;}.viz-controls-mapbuilder-contextmenu-action-layer-name{    padding-left: 5px;    font: bold 12px 'Helvetica Neue', Helvetica, arial, sans-serif; }.viz-controls-mapbuilder-contextmenu-input{   margin-left: 15px;  }.viz-controls-mapbuilder-contextmenu-input input{    width : 90%;    border-color: #dddddd;}.viz-controls-mapbuilder-contextmenu-action{    margin-left: 34px;    margin-top: 12px;}.viz-controls-mapbuilder-contextmenu-action-ok{    display: inline-block;    background-color : #f7f7f7;    float: right;    margin-right: 5px;    width:  50px;    height: 28px;     border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    background-image: url('../controls/mapbuilder/assets/ok.png');    background-position: center;    background-repeat: no-repeat;}.viz-controls-mapbuilder-contextmenu-action-ok:hover{    background-color : #eaeaea;    cursor: pointer;}.viz-controls-mapbuilder-contextmenu-action-cancel{    display: inline-block;    float: right;    background-color: #f7f7f7;    margin-right: 15px;    width:  50px;    height: 28px;     border-radius: 0px;    box-shadow: none;    border: 1px solid #BFBFBF;    background-image: url('../controls/mapbuilder/assets/cancel.png');    background-position: center;    background-repeat: no-repeat;}.viz-controls-mapbuilder-contextmenu-action-cancel:hover{    background-color : #eaeaea;    cursor: pointer;}.viz-controls-mapbuilder-map-provider {    margin-bottom: 12px;    }.viz-controls-mapbuilder-map-style{    display : inline-block;    width: 105px;    height: 95px;}.viz-controls-mapbuilder-map-style-esri-icon{    display : inline-block;    width: 100px;    height: 67px;}.viz-controls-mapbuilder-map-style-esri-topo{        background-image : url('../controls/mapbuilder/assets/topo.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-map-style-esri-streets{    background-image : url('../controls/mapbuilder/assets/streets.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-map-style-esri-national-geographic{       background-image : url('../controls/mapbuilder/assets/national-geographic.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-map-style .viz-controls-mapbuilder-map-style-esri-icon-selected{    border-color:#0091d9;    border-style: solid;     border-width: 1px;    box-sizing: border-box;        }.viz-controls-mapbuilder-map-style-esri-satellite{       background-image : url('../controls/mapbuilder/assets/satellite.png');    background-repeat: no-repeat;}.viz-controls-mapbuilder-property-text{    position: relative;    height: 13px;    font : normal 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: #585858;    top: 0px;}.viz-controls-mapbuilder-section-sub-title{    padding-bottom: 2px;}.viz-controls-mapbuilder-section-sub-title-text{    font : normal 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: #585858;}.viz-controls-mapbuilder-map-style-title{    font : normal 12px 'Helvetica Neue', Helvetica, Arial, sans-serif;    color: #585858;}.viz-controls-filterbar-layout {    background-color: #FAFAFA;    float: left;    position: absolute;    height: 100%;    white-space: nowrap;    left: 25px;    right:0px;}.viz-controls-filterbar-filterItems-container {    position: absolute;    min-height: 38px;    height:auto;    right:0px;    left:0px;    overflow-x : hidden;}.viz-controls-filterbar-header-plus-container {    background-color: #FAFAFA;    position: absolute;    cursor: pointer;    top: 8px;    left: 3px;    width: 24px;    height: 24px;}.viz-controls-filterbar-header-plus-container-hover, .viz-controls-filterbar-header-plus-container-pressed {    background-color: #007CC0;}.viz-controls-filterbar-header-plus {    background-position: 0px -1780px;    margin: 4px;}.viz-controls-filterbar-header-plus-hover, .viz-controls-filterbar-header-plus-pressed {    background-position: -32px -1861px;}.viz-controls-filterbar-clear-container, .viz-controls-filterbar-clear-container-disabled {    margin-top: 8px;    float: right;    width: 24px;    height: 24px;    cursor: pointer;}.viz-controls-filterbar-clear-container-disabled {    cursor: default;}.viz-controls-filterbar-clear-container-hover {    background-color: #EAEAEA;}.viz-controls-filterbar-clear-container-pressed {    background-color: #007CC0;}.viz-controls-filterbar-clear, .viz-controls-filterbar-clear-disabled {    background-position: 0px -1836px;    background-repeat: no-repeat;    width: 16px;    height: 16px;    margin: 4px;}.viz-controls-filterbar-clear-disabled {    opacity : 0.5;}.viz-controls-filterbar-clear-pressed {    background-position: -32px -1887px;}.viz-controls-filterbar-description {    line-height: 38px;    margin-left: 28px;    cursor:default;}.viz-controls-filterbar-filter-item {    height: 36px;    width: 180px;    border-radius: 3px;    cursor: default;}.viz-controls-filterbar-filter-item {    position: relative;    float: left;    display: inline;    margin-left: 10px;    margin-top: 1px;    background-color: #EFEFEF;    color: #333333;    border: 1px solid #DDD;}.viz-controls-filterbar-filter-item:hover {    background-color: #E5F2F9;    color: #007cc0;}.viz-controls-filterbar-filter-item-readonly {    background-color: #DCDCDC;}.viz-controls-filterbar-filter-item-readonly:hover {    color: #333333;}.viz-controls-filterbar-filter-values-active {    cursor: pointer;}.viz-controls-filterbar-filter-exclude {    text-decoration: line-through;}.viz-controls-filterbar-global-filter-item {    background-color: #DCDCDC;}.viz-controls-filterbar-global-filter-item:hover {    background-color: #E5F2F9;}.viz-controls-filterbar-filter-item-text, .viz-controls-filterbar-filter-item-info {    padding-left: 10px;    line-height: 20px;    font-size: 12px;    white-space: nowrap;}.viz-controls-filterbar-filter-item-text {    position : absolute;    max-width : 180px;    padding-left: 0px;    left : 10px;    top : 0px;    margin-right: 0px;    overflow: hidden;    text-overflow: ellipsis;    display: block;}.viz-controls-filterbar-range-filter-item-text {    right : 20px;}.viz-controls-filterbar-filter-item-info {    position : absolute;    padding-left: 0px;    top : 0px;    margin-right: 10px;    overflow: hidden;    text-overflow: ellipsis;    display: block;}.viz-controls-filterbar-delete-icon {    background-position: 0px -288px;    position: absolute;    cursor: pointer;    top: 2px;    right: 1px;}.viz-controls-filterbar-delete-icon:hover {    background-position: -18px -288px;}.viz-controls-filterbar-info-icon {    background-position: 0px -1807px;    position: absolute;    top: 2px;    right: 2px;    background-repeat: no-repeat;    width: 16px;    height: 16px;}.viz-controls-filterbar-info-icon:hover {    background-position: -66px -1807px;}.viz-controls-filterbar-filter-values {    padding-left: 10px;    display: block;    font-size: 10px;    white-space: nowrap;    overflow: hidden;    padding-bottom: 3px;    text-overflow: ellipsis;}.viz-controls-filterbar-filter-values {    position: absolute;    left : 0px;    right : 0px;    bottom: 0px;}.viz-controls-filterbar0-layout {    background-color: #FAFAFA;    float: left;    position: absolute;    height: 100%;    white-space: nowrap;    left: 25px;    right:0px;}.viz-controls-filterbar0-filterItems-container {    position: absolute;    min-height: 38px;    height:auto;    right:4px;    left:0px;}.viz-controls-filterbar0-header-plus {    background-position: 0px -1780px;    position: absolute;    top: 12px;    left: 7px;    cursor: pointer;}.viz-controls-filterbar0-header-plus:hover {    background-position: -32px -1861px;    background-color: #007CC0;}.viz-controls-filterbar0-description {    line-height: 38px;    margin-left: 28px;    cursor:default;    color: #999999;}.viz-controls-filterbar0-filter-item, .viz-controls-filterbar0-filter-item-tooltip,.viz-controls-filterbar0-global-filter-item {    height: 36px;    width: 180px;    border-radius: 3px;    cursor: default;}.viz-controls-filterbar0-filter-item, .viz-controls-filterbar0-global-filter-item {    position: relative;    float: left;    display: inline;    margin-left: 10px;    margin-top: 1px;    background-color: #FFFFFF;    border: 1px solid #DDD;}.viz-controls-filterbar0-filter-values-active {    color: #008fd3;    cursor: pointer;}.viz-controls-filterbar0-filter-exclude {    text-decoration: line-through;}.viz-controls-filterbar0-global-filter-item {    color : #FFFFFF;    background-color: #7F7F7F;}.viz-controls-filterbar0-filter-item-tooltip {    width: auto;    height: auto;    padding: 1px 10px 5px 0px;    position: absolute;    top: 40px;    z-index: 999999;    display: block;    min-width: 100px;    max-width: 300px;    min-height: 37px;    background-color: #F2F2F2;    border: 1px solid #7F7F7F;    box-shadow: 5px 5px 10px rgba(0,0,0,0.5);    -webkit-box-shadow: 5px 5px 10px rgba(0,0,0,0.5);    -moz-box-shadow: 5px 5px 10px rgba(0,0,0,0.5);}.viz-controls-filterbar0-filter-item-tooltip-globalfilter {    color : #A6DBF2;}.viz-controls-filterbar0-filter-item-tooltip-title, .viz-controls-filterbar0-filter-item-text, .viz-controls-filterbar0-filter-item-info, .viz-controls-filterbar0-filter-item-tooltip-globalfilter {    padding-left: 10px;    line-height: 20px;    font-weight: bold;    font-size: 12px;    white-space: nowrap;}.viz-controls-filterbar0-filter-item-tooltip-title {    display: block;    overflow: hidden;    text-overflow: ellipsis;}.viz-controls-filterbar0-filter-item-text {    position : absolute;    max-width : 180px;    padding-left: 0px;    left : 10px;    top : 0px;    margin-right: 0px;    overflow: hidden;    text-overflow: ellipsis;    display: block;}.viz-controls-filterbar0-range-filter-item-text {    right : 20px;}.viz-controls-filterbar0-filter-item-info {    position : absolute;    padding-left: 0px;    top : 0px;    margin-right: 10px;    overflow: hidden;    text-overflow: ellipsis;    display: block;}.viz-controls-filterbar0-delete-icon {    background-position: 0px -34px;    position: absolute;    cursor: pointer;    top: 2px;    right: 1px;}.viz-controls-filterbar0-delete-icon:hover {    background-position: -17px -34px;}.viz-controls-filterbar0-filter-item-tooltip-value, .viz-controls-filterbar0-filter-values {    padding-left: 10px;    display: block;    font-size: 11px;    white-space: nowrap;    overflow: hidden;    padding-bottom: 3px;    text-overflow: ellipsis;}.viz-controls-filterbar0-filter-item-tooltip-value {    top: -16px;    word-wrap: break-word;    word-break: normal;    line-height: 15px;    display: -webkit-box;    -webkit-line-clamp: 15;    -webkit-box-orient: vertical;}.viz-controls-filterbar0-filter-values {    position: absolute;    left : 0px;    right : 0px;    bottom: 0px;}.viz-controls-playcontrol-body {    height :60px !important;}.viz-controls-playcontrol-playbtn{    top : 25.5px !important;    background-color : transparent !important;    border-color : transparent !important;    box-shadow: none !important;    padding : 0px !important;    width : 22px !important;    height : 29px !important;}.viz-controls-playcontrol-slider .sapUiSliHori.sapUiSli {    padding : 0px !important;}.viz-controls-playcontrol-slider {    top : 40px !important;}.viz-controls-playcontrol-label{    font-size : 18px;    color : #007cc0;    bottom : 28px;    position : absolute;    text-overflow : ellipsis;    overflow : hidden;    white-space:nowrap;}.viz-controls-propertyeditor-main {    padding: 0px;}.viz-controls-propertyeditor-title {    font-weight: bold;    height: auto;    line-height: 36px;    cursor: default;}.viz-controls-propertyeditor-title-splitter {    border-bottom: solid 1px #dddddd;    margin-bottom: 10px;    width: calc(100% - 12px);}.viz-controls-propertyeditor-section-selector-container {    padding-top: 8px;    width: 176px;    height: 24px;}.viz-controls-propertyeditor-views-container {    padding-bottom: 8px;    width: 176px;}.viz-controls-propertyeditor-series-type-container {    padding-top: 16px;    width: 176px;}.viz-controls-propertyeditor-series-type-container .sapUiTfCombo{    width: 22ex !important;}.viz-controls-propertyeditor-views-container-padding-top {    padding-top: 10px;}.viz-controls-propertyeditor-view-item-padding-bottom {    padding-bottom: 8px;}.viz-controls-propertyeditor-view-item {    padding-top: 8px;    line-height: 24px;    height: 24px;}/*@formatter:off*//* clearfix */.viz-controls-propertyeditor-view-item:before,.viz-controls-propertyeditor-view-item:after,.viz-controls-propertyeditor-view-item-indent1:before,.viz-controls-propertyeditor-view-item-indent1:after,.viz-controls-propertyeditor-view-item-indent2:before,.viz-controls-propertyeditor-view-item-indent2:after {    display: table;    content: ' ';}.viz-controls-propertyeditor-view-item:after,.viz-controls-propertyeditor-view-item-indent1:after,.viz-controls-propertyeditor-view-item-indent2:after {    clear: both;}/*@formatter:on*/.viz-controls-propertyeditor-view-item-indent1 {    padding-left: 22px;}.viz-controls-propertyeditor-view-item-indent2 {    padding-left: 44px;}.viz-controls-propertyeditor-view-item-row, .viz-controls-propertyeditor-view-item-indent1, .viz-controls-propertyeditor-view-item-indent2 {    clear: both;    line-height: 24px;    height: 24px;}.viz-controls-propertyeditor-view-item-cell {    float: left;    padding-right: 8px;    line-height: 24px;}.viz-controls-propertyeditor-view-item-cell:last-child {    padding-right: 0px;}.viz-controls-propertyeditor-view-item-cell-wrap {    float: left;    padding-right: 8px;    line-height: 24px;}.viz-controls-propertyeditor-view-item-cell-wrap:last-child {    padding-right: 0px;}.viz-controls-propertyeditor-shapepicker-container {    float: left;    width: 70px;    border: 1px solid #bfbfbf;    background-color: #FFFFFF;    height: 20px;}.viz-controls-propertyeditor-shapepicker-container:hover {    border-color: #007CC0;}.viz-controls-propertyeditor-shapepicker-dropdown-arrow {    float: right;    width: 20px;    height: 20px;    background-color: transparent;    background-position: -2px -360px;}.viz-controls-propertyeditor-shapepicker-dropdown-arrow:hover {    width: 20px;    height: 20px;    background-color: #007CC0;    background-position: -15px -360px;    cursor: pointer;}.viz-controls-propertyeditor-shapepicker-shape {    float: left;    border: none;    width: 40px;    height: 20px;    margin: 0px 5px;}.viz-controls-propertyeditor-shapepicker-list {    position: absolute;    border: none;    margin-top: 24px;    width: 100px;}.viz-controls-propertyeditor-shapepicker-list ul {    padding: 3px;    border: 1px solid #bfbfbf;    background-color: #ffffff;    list-style: none;    margin: 0px;    display: inline-block;    -webkit-transition: 0.3s ease-out;    -moz-transition: 0.3s ease-out;    -o-transition: 0.3s ease-out;    transition: 0.3s ease-out;    position: absolute;    box-shadow: 0 4px 17px rgba(0,0,0,0.4);    -webkit-box-shadow: 0 4px 17px rgba(0,0,0,0.4);}.viz-controls-propertyeditor-vizchartview-childcontainer {    margin-left: 22px;    padding-top: 4px;}.viz-controls-propertyeditor-shapepicker-list li {    position: relative;    height: 20px;}.viz-controls-propertyeditor-shapepicker-list li:hover {    background-color: #e5f2f9;}.viz-controls-propertyeditor-linestylepicker-list {    position: absolute;    border: none;    padding: 1px 0px;    margin-top: 24px;    z-index: 1;}.viz-controls-propertyeditor-linestylepicker-list ul {    padding: 3px 6px;    border: 1px solid #bfbfbf;    background-color: #ffffff;    list-style: none;    margin: 0px;    display: inline-block;    -webkit-transition: 0.3s ease-out;    -moz-transition: 0.3s ease-out;    -o-transition: 0.3s ease-out;    transition: 0.3s ease-out;    position: absolute;    box-shadow: 0 4px 17px rgba(0,0,0,0.4);    -webkit-box-shadow: 0 4px 17px rgba(0,0,0,0.4);}.viz-controls-propertyeditor-linestylepicker-list-li {    position: relative;    height: 20px;    padding-left: 1px;}.viz-controls-propertyeditor-linestylepicker-list-li:hover {    background-color: #e5f2f9;}.viz-controls-propertyeditor-linestylepicker-list-li-selected {    position: relative;    height: 20px;    border: 1px solid #000000;    background-color: #C6D9F1;    padding-right: 1px;}.viz-controls-propertyeditor-linestylepicker-list-shape {    float: left;    border: none;    width: 61px;    height: 20px;    pointer-events: none;}.viz-controls-propertyeditor-linestyle {    height: 48px;}.viz-controls-propertyeditor-slicestyle {    height: 48px;}.viz-controls-propertyeditor-donut-chartarea {    height: 48px;}.viz-controls-propertyeditor-colorpicker-container {    z-index: 999999;}.viz-controls-propertyeditor-colorpicker-colorDiv {    height: 5px;}.viz-controls-propertyeditor-colorpicker-choose-button {    position: absolute;    right: 3px;}.viz-controls-propertyeditor-colorpicker-cancel-button {    position: relative;    left: 150px;}.viz-controls-propertyeditor-icon {    background-image: url('../controls/propertyeditor/assets/UVB_PropertyEditorSprite.png');}.viz-controls-propertyeditor-colorpicker-background-img {    display: inline-block;    margin: 4px;    width: 16px;    height: 16px;    background-image: url('../controls/propertyeditor/assets/UVB_PropertyEditorSprite.png');    background-repeat: no-repeat;    vertical-align: center;}.viz-controls-propertyeditor-colorpicker-background-color {    display: inline-block;    margin: 3px 0px 3px 7px;    width: 16px;    height: 16px;    background-repeat: no-repeat;    vertical-align: center;}.viz-controls-propertyeditor-colorpicker-pickercontainer {    width: 48px !important;}.viz-controls-propertyeditor-colorpicker-pickercontainer:hover {    cursor: pointer;}.viz-controls-propertyeditor-colorpicker-picker-colorcontainer {    width: 80%;    height: 4px;    margin: auto;}.viz-controls-propertyeditor-colorpicker-views-container {    position: absolute;    z-index: 999999;    background-color: #F2F2F2;    border: 1px solid #DAD9D9;    box-shadow: 0 4px 17px rgba(0,0,0,0.4);    -webkit-box-shadow: 0 4px 17px rgba(0,0,0,0.4);}.viz-controls-propertyeditor-iconpicker-container {    width: 76px !important;}.viz-controls-propertyeditor-iconpicker-dropdown-arrow {    float: right;    width: 20px;    height: 20px;    background-color: transparent;    background-position: -2px -360px;}.viz-controls-propertyeditor-iconpicker-dropdown-arrow:hover {    width: 20px;    height: 20px;    background-color: #007CC0;    background-position: -15px -360px;    cursor: pointer;}.viz-controls-propertyeditor-iconpicker-icon {    float: left;    border: none;    width: 40px;    height: 16px;    margin: 1px 7px;}.viz-controls-propertyeditor-iconpicker-list {    position: absolute;    margin-top: 24px;    padding: 3px 0px 3px 7px;    z-index: 1;    background-color: #FFFFFF;    border: 1px solid #DAD9D9;    box-shadow: 0 4px 17px rgba(0,0,0,0.4);    -webkit-box-shadow: 0 4px 17px rgba(0,0,0,0.4);    width: 123px;    max-height: 200px;    overflow: scroll;}.viz-controls-propertyeditor-iconpicker-list-row {    position: relative;    height: 29px;}.viz-controls-propertyeditor-iconpicker-list-cell {    float: left;    width: 25px;    height: 25px;    margin: 2px;}.viz-controls-propertyeditor-iconpicker-list-cell:hover {    background-color: #e5f2f9;}.viz-controls-propertyeditor-iconpicker-list-icon {    border: none;    width: 25px;    height: 25px;    pointer-events: none;}.viz-controls-propertyeditor-thicknesspicker-dropdown-arrow {    position: absolute;    right: 0px;    width: 20px;    height: 20px;    background-color: transparent;    background-position: -2px -360px;}.viz-controls-propertyeditor-thicknesspicker-dropdown-arrow:hover {    width: 20px;    height: 20px;    background-color: #007CC0;    background-position: -15px -360px;    cursor: pointer;}.viz-controls-propertyeditor-thicknesspicker-line {    float: left;    border: none;    width: 56px;    height: 20px;    margin: 0px 1px;    cursor: pointer;}.viz-controls-propertyeditor-thicknesspicker-container {    width: 76px !important;}.viz-controls-propertyeditor-thicknesspicker-container:hover {    border-color: #007CC0;}.viz-controls-propertyeditor-thicknesspicker-list {    position: absolute;    border: none;    padding: 1px 0px;    margin-top: 24px;    z-index: 1;}.viz-controls-propertyeditor-thicknesspicker-list ul {    width: 110px;    padding: 3px 10px;    border: 1px solid #bfbfbf;    background-color: #ffffff;    list-style: none;    margin: 0px;    display: inline-block;    -webkit-transition: 0.3s ease-out;    -moz-transition: 0.3s ease-out;    -o-transition: 0.3s ease-out;    transition: 0.3s ease-out;    position: absolute;    box-shadow: 0 4px 17px rgba(0,0,0,0.4);    -webkit-box-shadow: 0 4px 17px rgba(0,0,0,0.4);}.viz-controls-propertyeditor-thicknesspicker-list li {    clear: left;    float: left;}.viz-controls-propertyeditor-thicknesspicker-list-line-container, .viz-controls-propertyeditor-thicknesspicker-list-line-container-selected {    vertical-align: middle;    padding-left: 2px;    float: left;    width: 105px;    height: 22px;    margin: auto;}.viz-controls-propertyeditor-thicknesspicker-list-line-container-selected {    border: 1px solid #000000;    background-color: #C6D9F1;    margin-left: -1px;}.viz-controls-propertyeditor-thicknesspicker-list-line-container:hover {    background-color: #e5f2f9;}.viz-controls-propertyeditor-thicknesspicker-list-line {    width: 48px;    margin: auto;}.viz-controls-propertyeditor-listpicker {   clear: both;   height: 48px;}.viz-controls-propertyeditor-listpicker-dropdown {    width: 6em;}.viz-controls-propertyeditor-formatpicker-number {    height: 80px;}.viz-controls-propertyeditor-formatpicker-dropdown {    width: 4em;}.viz-controls-propertyeditor-alignmentpicker-button {    float: left;    margin-right: 8px;    width: 22px;    height: 22px;    text-align: center;    border: 1px solid #bfbfbf;    cursor: pointer;}.viz-controls-propertyeditor-alignmentpicker-button:hover {    border-color: #007CC0;}.viz-controls-propertyeditor-alignmentpicker-unselected-left, .viz-controls-propertyeditor-alignmentpicker-unselected-center, .viz-controls-propertyeditor-alignmentpicker-unselected-right {    background-color: #f9f7f7;    background-repeat: no-repeat;}.viz-controls-propertyeditor-alignmentpicker-selected-left, .viz-controls-propertyeditor-alignmentpicker-selected-center, .viz-controls-propertyeditor-alignmentpicker-selected-right {    background-color: #007CC0;    background-repeat: no-repeat;}.viz-controls-propertyeditor-alignmentpicker-unselected-left {    background-position: 1px -55px;}.viz-controls-propertyeditor-alignmentpicker-unselected-center {    background-position: 1px -95px;}.viz-controls-propertyeditor-alignmentpicker-unselected-right {    background-position: 1px -133px;}.viz-controls-propertyeditor-alignmentpicker-selected-left {    background-position: 1px -75px;}.viz-controls-propertyeditor-alignmentpicker-selected-center {    background-position: 1px -114px;}.viz-controls-propertyeditor-alignmentpicker-selected-right {    background-position: 1px -151px;}.viz-controls-propertyeditor-spin {    position: relative;    padding-right: 18px;    box-shadow: 0 1px 0 rgba(255,255,255,0.5);    width: 40px;    height: 24px;}.viz-controls-propertyeditor-spin-input {    position: absolute;    width: 100%;    height: 22px;    display: block;    border: 1px solid rgb(224,224,224);    background-color: #f7f7f7;    color: rgb(64,64,64);    font-family: inherit;    font-size: 11px;    box-shadow: 0 2px 2px rgba(0,0,0,0.03125) inset;}.viz-controls-propertyeditor-spin-input .sapUiTfStd {    text-indent: 7px;}.viz-controls-propertyeditor-spin-upButton {    position: absolute;    display: block;    top: 2px;    right: 0;    width: 12px;    height: 10px;    border: 1px solid rgb(224,224,224);    background: rgb(248,248,248);    cursor: pointer;}.viz-controls-propertyeditor-spin-downButton {    position: absolute;    display: block;    right: 0;    bottom: 0;    width: 12px;    height: 10px;    border: 1px solid rgb(224,224,224);    background: rgb(248,248,248);    cursor: pointer;}.viz-controls-propertyeditor-spin-upButton-content {    display: block;    width: 12px;    height: 10px;    background-position: -4px -42px;    background-repeat: no-repeat;}.viz-controls-propertyeditor-spin-downButton-content {    display: block;    width: 12px;    height: 10px;    background-position: -4px -25px;    background-repeat: no-repeat;}.viz-controls-propertyeditor-colorpicker-views-container {    width: 192px;    border: 1px solid #bfbfbf !important;    box-sizing: border-box;    padding: 11px 11px 0px 11px !important;    background-color: #ffffff!important;}.viz-controls-propertyeditor-colorpicker-views-container.geocolorpicker-views-container {  width: auto;  padding: 11px 11px 11px 11px !important;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiUx3TPArrow {    display: none;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiUx3TPContent {    margin: 0;}.viz-controls-propertyeditor-colorpicker-views-container .colorButton {    width: 16px;    height: 16px;    border-radius: 0;    margin: 0 0 3px 3px;    padding: 1px;    background: none;    box-shadow: initial !important;    -moz-box-shadow: none;    -webkit-box-shadow: none;    border: 1px solid rgb(191, 191, 191) !important;}.viz-controls-propertyeditor-colorpicker-views-container .colorButton:hover {    box-shadow: initial !important;}.viz-controls-propertyeditor-colorpicker-views-container .colorButton:nth-child(9n+1) {    margin-left: 0;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiBtnS.sapUiBtnStd:hover,.viz-controls-propertyeditor-colorpicker-views-container .sapUiBtnS.sapUiBtnStd.sapUiBtnStdHover,.viz-controls-propertyeditor-colorpicker-views-container .sapUiBtnS.sapUiBtnStd:focus,.viz-controls-propertyeditor-colorpicker-views-container .sapUiBtnS.sapUiBtnStd.sapUiBtnStdFocus {  background-image: none;}.viz-controls-propertyeditor-colorpicker-views-container .colorButtonSelected {    border: 1px solid #009DE0 !important;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiToggleBtn {    background-image: url('../controls/propertyeditor/assets/ComboBoxArrow_regular_fold.png') !important;    background-color: transparent !important;    border: 2px solid rgba(0,0,0,0) !important;    color: #666 !important;    font-weight: normal !important;    padding-left: 20px;    background-repeat: no-repeat !important;    box-shadow: initial !important;    background-position: 0px 2px !important;    height: 24px;    margin-bottom: 5px;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiToggleBtn:hover {    height: 24px;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiToggleBtnPressed {    background-image: url('../controls/propertyeditor/assets/ComboBoxArrow_regular.png') !important;    border: 2px solid rgba(0, 143, 211,0.1) !important;}.viz-controls-propertyeditor-colorpicker-views-container .noColorText {    color: #666 !important;    font-weight: normal!important;}.viz-controls-propertyeditor-colorpicker-views-container .recentColorLabel {    font-size: 10px!important;    color: #666!important;}.viz-controls-propertyeditor-colorpicker-views-container .recentColorsContainer {    height: 20px;}.viz-controls-propertyeditor-colorpicker-views-container .noColorText:hover {    color: red !important;}/* * Styling sap.ui.commons.ColorPicker so that it looks completely different */.viz-controls-propertyeditor-colorpicker-views-container table,.viz-controls-propertyeditor-colorpicker-views-container tbody,.viz-controls-propertyeditor-colorpicker-views-container tr,.viz-controls-propertyeditor-colorpicker-views-container td {  display: block;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiColorPicker-ColorPickerMatrix {    height: 278px;    width: 100% !important;    background: none;    display: none;}.viz-controls-propertyeditor-colorpicker-views-container .visible .sapUiColorPicker-ColorPickerMatrix {    display: block;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiMltCell {    padding: 0 !important;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiColorPicker-ColorPickerBox {    height: 166px;    width: 166px;    margin: 0;}.viz-controls-propertyeditor-colorpicker-views-container tr:first-child > td:nth-child(2) {    position: absolute;    margin-top: 45px;}.viz-controls-propertyeditor-colorpicker-views-container tr:first-child > td:nth-child(2) .sapuiVltCell {    float: left;}.viz-controls-propertyeditor-colorpicker-views-container tr:first-child > td:nth-child(2) input {    margin-right: 0;    margin-left: 0;}.viz-controls-propertyeditor-colorpicker-views-container tr:first-child > td:nth-child(2) .sapUiHLayoutChildWrapper:last-child {    margin-left: 3px;}.viz-controls-propertyeditor-colorpicker-views-container tr:first-child > td:nth-child(3) {    display: none;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiHLayoutNoWrap > div:nth-child(3) {    display: none;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiHLayoutNoWrap > div:nth-child(4) {    display: none;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiColorPicker-ColorPickerSlider.sapUiSli.sapUiSliHori.sapUiSliStd {    width: 97% !important;    padding-top: 8px !important;    height: 10px;}.viz-controls-propertyeditor-colorpicker-views-container .sapUiColorPicker-ColorPickerAlphaSlider.sapUiSli.sapUiSliHori.sapUiSliStd {    width: 97% !important;    padding-top: 8px !important;    height: 10px;}/* this style is for slider bar */.viz-controls-propertyeditor-view-item-slider-container {    height: 56px;}.viz-controls-propertyeditor-views-slider-container .sapUiSliHori.sapUiSli {    padding-top: 0px;    vertical-align: bottom;}.viz-controls-propertyeditor-views-slider-container .sapUiSliHori>.sapUiSliR {    margin-left: 0px;}/*@formatter:off*/.viz-controls-propertyeditor-main .sapUiCb,.viz-controls-propertyeditor-main .sapUiRb,.viz-controls-propertyeditor-main .sapUiLbl,.viz-controls-propertyeditor-main .sapUiTriCb,.viz-controls-propertyeditor-main .sapUiTf {    font-size: 12px !important;    text-overflow: ellipsis;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;}.viz-controls-propertyeditor-chartarea-layoutbtn .sapUiBtn {    font-size: 12px !important;    text-overflow: ellipsis;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;    border: 1px solid #BFBFBF !important;    color: #666 !important;    background: #ffffff;    /* Old browsers */    background: -moz-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    /* FF3.6+ */    background: -webkit-gradient(linear, left top, left bottom, color-stop(80%, #ffffff), color-stop(100%, #f2f2f2)) !important;    /* Chrome,Safari4+ */    background: -webkit-linear-gradient(top, #ffffff 80%, #f2f2f2 100%) !important;    /* Chrome10+,Safari5.1+ */    background: -o-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    /* Opera 11.10+ */    background: -ms-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    /* IE10+ */    background: linear-gradient(to bottom, #ffffff 80%, #f2f2f2 100%);    /* W3C */}.viz-controls-propertyeditor-chartarea-layoutbtn .sapUiBtn:hover {    border: 1px solid #BFBFBF !important;    color: #666 !important;    -webkit-box-shadow: 0px 1px 0px 1px rgba(0, 0, 0, 0.1) !important;    box-shadow: 0px 1px 0px 1px rgba(0, 0, 0, 0.1) !important;    background: #f2f2f2;    /* Old browsers */    background: -moz-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    /* FF3.6+ */    background: -webkit-gradient(linear, left top, left bottom, color-stop(8%, #f2f2f2), color-stop(100%, #fafafa)) !important;    /* Chrome,Safari4+ */    background: -webkit-linear-gradient(top, #f2f2f2 8%, #fafafa 100%) !important;    /* Chrome10+,Safari5.1+ */    background: -o-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    /* Opera 11.10+ */    background: -ms-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    /* IE10+ */    background: linear-gradient(to bottom, #f2f2f2 8%, #fafafa 100%);    /* W3C */}.viz-controls-propertyeditor-main .sapUiCb,.viz-controls-propertyeditor-main .sapUiLbl {    vertical-align: middle;}/*@formatter:on*/.viz-controls-propertyeditor-fixpicker-container {    height: 40px;}.viz-controls-propertyeditor-fixpicker-fix {    width: 76px;}.viz-controls-propertyeditor-fontpicker {    height: 64px;}.viz-controls-propertyeditor-fontpicker-button:hover {    color: #FFFFFF !important;}.viz-controls-propertyeditor-fontpicker-family {    width: 76px;}.viz-controls-propertyeditor-fontpicker-size {    width: 48px;}.viz-controls-propertyeditor-fontpicker-color {    float: left;    margin: 0px 0px 8px 0px;    height: 24px;    width: 24px;    line-height: normal;}.viz-controls-propertyeditor-main button:not(.sapUiSegButtonSelected) {  height: 24px;  width: 24px;  padding: 0;  background-color: #f7f7f7 !important;  background-image: none !important;  background-repeat: no-repeat !important;  background-position: center center !important;  border-radius: 0 !important;  box-shadow: none !important;  border: 1px solid #bfbfbf !important;}.viz-controls-propertyeditor-main .sapUiSegmentedButton button {  height: 24px;  width: 24px;  padding: 0;  border-radius: 0 !important;  box-shadow: none !important;  border: 1px solid #bfbfbf !important;}.viz-controls-propertyeditor-main .sapUiTfStd {  height: 24px;  padding: 0 20px 0 0;  background-color: #f7f7f7 !important;  background-image: none !important;  background-repeat: no-repeat !important;  background-position: center center !important;  border-radius: 0 !important;  box-shadow: none !important;  border: 1px solid #bfbfbf !important;  color: #333;}.viz-controls-propertyeditor-main .sapUiTfInner {  background: none;  padding-left: 7px !important;}.viz-controls-propertyeditor-main .sapUiTfComboIcon {  width: 18px;  height: 22px;  background-position: center right;}.viz-controls-propertyeditor-main button:focus {  border: 1px dotted #bfbfbf !important;}.viz-controls-propertyeditor-main button:not(.sapUiBtnDsbl):hover {  background-color: #007cc0 !important;}.viz-controls-propertyeditor-main button.sapUiToggleBtnPressed {  background-color: #007cc0 !important;}/*override the background-color setting in viz-controls-propertyeditor-main .sapUiTfStd */.viz-controls-propertyeditor-fixpicker-input .sapUiTfStd {    text-indent: 7px;    background-color: #ffffff !important}/* this style is for viz property editor collapse function */.viz-controls-propertyeditor-collapse {    width: 176px;    height: 24px;}.viz-controls-propertyeditor-expand-icon {    float:left;    background-position: -22px -51px;    cursor: pointer;    margin-top: 5px;}.viz-controls-propertyeditor-collapse-icon {    float:left;    background-position: -40px -51px;    cursor: pointer;    margin-top: 5px;}.viz-controls-propertyeditor-title-text {    line-height: 24px;    height: 24px;    font-weight: bold;}.viz-controls-propertyeditor-title-text .sapUiLbl {    font-size: 12px !important;    color: #444444 !important;}.viz-controls-propertyeditor-section-selector-container .sapUiTf {    font-size: 12px !important;}.viz-controls-propertyeditor-main .sapUiRb>label,.viz-controls-propertyeditor-main .sapUiCb>label {    font-size: 12px;}.viz-controls-propertyeditor-main .sapUiTriCbLbl,.viz-controls-propertyeditor-main .sapUiRb>label,.viz-controls-propertyeditor-main .sapUiCb>label,.viz-controls-propertyeditor-main .sapUiLbl {    color: #666;}.viz-controls-propertyeditor-rotatebutton-container .sapUiBtnStd {    background-image: url('../controls/propertyeditor/assets/rotate_black.png') !important;    background-color: transparent !important;}.viz-controls-propertyeditor-rotatebutton-container .sapUiBtnAct {    background-image: url('../controls/propertyeditor/assets/rotate_white.png') !important;    background-color: transparent !important;}.sapUiLbxStd>ul>.sapUiLbxIDis {    background-color: transparent !important;}.viz-controls-propertyeditor-view-item-row .sapUiSliHori.sapUiSli{    padding-top: 10px;}.viz-controls-switchbar-dropDownList {    position: absolute;    top : 0px;    width: auto;    z-index: 999999;}.viz-controls-switchbar-dropDownList-container {    position: absolute;    transition: opacity .3s ease-out, top .3s ease-out;    -moz-transition: opacity .3s ease-out, top .3s ease-out; /* Firefox 4 */    -webkit-transition: opacity .3s ease-out, top .3s ease-out; /* Safari and Chrome */    -o-transition: opacity .3s ease-out, top .3s ease-out; /* Opera */    opacity: 0;    top: 0px;    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);    border: 1px solid #DAD9D9;    background-color: #ffffff;}.viz-controls-switchbar-dropDownList-arrow {    top: -6px;    height: 24px;    width: 24px;    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);    border: 1px solid #DAD9D9;    background-color: #ffffff;    position: absolute;    -webkit-transform: rotate(45deg);    -moz-transform: rotate(45deg);    -ms-transform: rotate(45deg);    -o-transform: rotate(45deg);    transform: rotate(45deg);}.viz-controls-switchbar-dropDownList-content {    background-color: #FFF;    box-shadow: 0px 0px 0px 0px rgba(0, 143, 211, 0.15);    border: 0px solid #DAD9D9;    -webkit-box-shadow: inset 0px 0px 0px 0px rgba(0, 143, 211, 0.15);    border-radius: 5px;    width: 1000px;    position: absolute;    padding: 2px 7px;}.viz-controls-switchbar-chart-list-header {    margin: 2px 8px 2px 2px;    padding: 12px 1px 1px 4px;    font-size: 12px;    font-weight: bold;    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;}.viz-controls-switchbar-chart-list-container {    padding: 0px;    background-color: #ffffff;    list-style: none;    display: inline-block;    margin: 0px;}.viz-controls-switchbar-dropDownList li {    width: auto;    white-space: nowrap;}.viz-controls-switchbar-dropDownList-chart-list {    line-height: 32px;    cursor: pointer;}.viz-controls-switchbar-dropDownList-chart-list:hover {    background-color: #E5F2F9;    color: #585858;}.viz-controls-switchbar-dropDownList-chart-list-selected {    background-color: #007CC0;    color: #ffffff;}.viz-controls-switchbar-dropDownList-chart-text {    padding: 12px 1px 1px 12px;    font-size: 12px;    font-weight: normal;}.viz-controls-switchbar-chart-list-header {    padding: 6px 0px 6px 0px;    font-size: 12px;    display: inline-block;    font-weight: normal;    cursor: default;}.viz-controls-switchbar-chart-list-icon {    margin-top: 5px;    margin-right: 8px;}.viz-controls-switchbar-view {    width: 100%;    height: 100%;    min-width: 141px;    position: relative;}.viz-controls-switchbar-switcher-container {    position: relative;}.viz-controls-switchbar-switcher {    position: absolute;    width: 56px;    height: 32px;    border-radius: 0px;}.viz-controls-switchbar-chart {    background-color: #ffffff;    border: 1px solid #bfbfbf;}.viz-controls-switchbar-chart:last-child {    margin-right: 0px;}/* Do not replace old class when selected, just add new one*/.viz-controls-switchbar-chart-selected {    border: 1px solid #007CC0;    background-color:#007cc0;}.viz-controls-switchbar-chart:hover {    border: 1px solid #BFBFBF;    background: -webkit-gradient(linear, left top, left bottom, color-stop(8%, #f2f2f2), color-stop(100%, #fafafa));}.viz-controls-switchbar-chart-text {    padding: 12px 1px 1px 12px;    font-size: 12px;    font-weight: normal;}.viz-controls-switchbar-chart-icon-wrapper {    width: 37px;    height: 34px;    float: left;}.viz-controls-switchbar-chart-icon {    background-image: url('../controls/switchbar/assets/UVB_ChartSwitchSprite.png');    width: 24px;    height: 24px;    float: left;    margin: 4px 8px 6px 5px;}.viz-controls-switchbar-chart-icon-crosstab {    background-position: 0px -1176px;}.viz-controls-switchbar-chart-icon-number {    background-position: 0px -1149px;}.viz-controls-switchbar-chart-icon-column {    background-position: 0px 0px;}.viz-controls-switchbar-chart-icon-stacked-column {    background-position: 0px -34px;}.viz-controls-switchbar-chart-icon-dual-column {    background-position: 0px -68px;}.viz-controls-switchbar-chart-icon-3D-column {    background-position: 0px -102px;}.viz-controls-switchbar-chart-icon-line {    background-position: 0px -136px;}.viz-controls-switchbar-chart-icon-area {    background-position: 0px -170px;}.viz-controls-switchbar-chart-icon-combination {    background-position: 0px -204px;}.viz-controls-switchbar-chart-icon-dual-line {    background-position: 0px -238px;}.viz-controls-switchbar-chart-icon-dual-combination {    background-position: 0px -272px;}.viz-controls-switchbar-chart-icon-pie {    background-position: 0px -306px;}.viz-controls-switchbar-chart-icon-donut {    background-position: 0px -340px;}.viz-controls-switchbar-chart-icon-pie-with-depth {    background-position: 0px -374px;}.viz-controls-switchbar-chart-icon-geo-bubble {    background-position: 0px -408px;}.viz-controls-switchbar-chart-icon-geo-choropleth {    background-position: 0px -442px;}.viz-controls-switchbar-chart-icon-geo-pie {    background-position: 0px -476px;}.viz-controls-switchbar-chart-icon-geo-map {    background-position: 0px -510px;}.viz-controls-switchbar-chart-icon-scatter {    background-position: 0px -544px;}.viz-controls-switchbar-chart-icon-bubble {    background-position: 0px -578px;}.viz-controls-switchbar-chart-icon-scatter-matrix {    background-position: 0px -612px;}.viz-controls-switchbar-chart-icon-heatmap {    background-position: 0px -646px;}.viz-controls-switchbar-chart-icon-treemap {    background-position: 0px -680px;}.viz-controls-switchbar-chart-icon-table {    background-position: 0px -714px;}.viz-controls-switchbar-chart-icon-radar {    background-position: 0px -748px;}.viz-controls-switchbar-chart-icon-boxplot {    background-position: 0px -782px;}.viz-controls-switchbar-chart-icon-waterfall {    background-position: 0px -816px;}.viz-controls-switchbar-chart-icon-tag-cloud {    background-position: 0px -850px;}.viz-controls-switchbar-chart-icon-tree {    background-position: 0px -884px;}.viz-controls-switchbar-chart-icon-network {    background-position: 0px -918px;}.viz-controls-switchbar-chart-icon-funnel {    background-position: 0px -952px;}.viz-controls-switchbar-chart-icon-pc {    background-position: 0px -986px;}.viz-controls-switchbar-chart-icon-extension {    background-position: 0px -1020px;}.viz-controls-switchbar-chart-icon-bar {    background-position: 0px -1054px;}.viz-controls-switchbar-chart-icon-stacked-bar {    background-position: 0px -1088px;}.viz-controls-switchbar-chart-icon-dual-bar {    background-position: 0px -1122px;}.viz-controls-switchbar-chart-icon-crosstab-white {    background-position: -44px -1176px;}.viz-controls-switchbar-chart-icon-number-white {    background-position: -44px -1149px;}.viz-controls-switchbar-chart-icon-column-white {    background-position: -44px 0px;}.viz-controls-switchbar-chart-icon-stacked-column-white {    background-position: -44px -34px;}.viz-controls-switchbar-chart-icon-dual-column-white {    background-position: -44px -68px;}.viz-controls-switchbar-chart-icon-3D-column-white {    background-position: -44px -102px;}.viz-controls-switchbar-chart-icon-line-white {    background-position: -44px -136px;}.viz-controls-switchbar-chart-icon-area-white {    background-position: -44px -170px;}.viz-controls-switchbar-chart-icon-combination-white {    background-position: -44px -204px;}.viz-controls-switchbar-chart-icon-dual-line-white {    background-position: -44px -238px;}.viz-controls-switchbar-chart-icon-dual-combination-white {    background-position: -44px -272px;}.viz-controls-switchbar-chart-icon-pie-white {    background-position: -44px -306px;}.viz-controls-switchbar-chart-icon-donut-white {    background-position: -44px -340px;}.viz-controls-switchbar-chart-icon-pie-with-depth-white {    background-position: -44px -374px;}.viz-controls-switchbar-chart-icon-geo-bubble-white {    background-position: -44px -408px;}.viz-controls-switchbar-chart-icon-geo-choropleth-white {    background-position: -44px -442px;}.viz-controls-switchbar-chart-icon-geo-pie-white {    background-position: -44px -476px;}.viz-controls-switchbar-chart-icon-geo-map-white {    background-position: -44px -510px;}.viz-controls-switchbar-chart-icon-scatter-white {    background-position: -44px -544px;}.viz-controls-switchbar-chart-icon-bubble-white {    background-position: -44px -578px;}.viz-controls-switchbar-chart-icon-scatter-matrix-white {    background-position: -44px -612px;}.viz-controls-switchbar-chart-icon-heatmap-white {    background-position: -44px -646px;}.viz-controls-switchbar-chart-icon-treemap-white {    background-position: -44px -680px;}.viz-controls-switchbar-chart-icon-table-white {    background-position: -44px -714px;}.viz-controls-switchbar-chart-icon-radar-white {    background-position: -44px -748px;}.viz-controls-switchbar-chart-icon-boxplot-white {    background-position: -44px -782px;}.viz-controls-switchbar-chart-icon-waterfall-white {    background-position: -44px -816px;}.viz-controls-switchbar-chart-icon-tag-cloud-white {    background-position: -44px -850px;}.viz-controls-switchbar-chart-icon-tree-white {    background-position: -44px -884px;}.viz-controls-switchbar-chart-icon-network-white {    background-position: -44px -918px;}.viz-controls-switchbar-chart-icon-funnel-white {    background-position: -44px -952px;}.viz-controls-switchbar-chart-icon-pc-white {    background-position: -44px -986px;}.viz-controls-switchbar-chart-icon-extension-white {    background-position: -44px -1020px;}.viz-controls-switchbar-chart-icon-bar-white {    background-position: -44px -1054px;}.viz-controls-switchbar-chart-icon-stacked-bar-white {    background-position: -44px -1088px;}.viz-controls-switchbar-chart-icon-dual-bar-white {    background-position: -44px -1122px;}.viz-controls-switchbar-chart-icon-crosstab-grey {    background-position: -88px -1176px;}.viz-controls-switchbar-chart-icon-number-grey {    background-position: -88px -1149px;}.viz-controls-switchbar-chart-icon-column-grey {    background-position: -88px 0px;}.viz-controls-switchbar-chart-icon-stacked-column-grey {    background-position: -88px -34px;}.viz-controls-switchbar-chart-icon-dual-column-grey {    background-position: -88px -68px;}.viz-controls-switchbar-chart-icon-3D-column-grey {    background-position: -88px -102px;}.viz-controls-switchbar-chart-icon-line-grey {    background-position: -88px -136px;}.viz-controls-switchbar-chart-icon-area-grey {    background-position: -88px -170px;}.viz-controls-switchbar-chart-icon-combination-grey {    background-position: -88px -204px;}.viz-controls-switchbar-chart-icon-dual-line-grey {    background-position: -88px -238px;}.viz-controls-switchbar-chart-icon-dual-combination-grey {    background-position: -88px -272px;}.viz-controls-switchbar-chart-icon-pie-grey {    background-position: -88px -306px;}.viz-controls-switchbar-chart-icon-donut-grey {    background-position: -88px -340px;}.viz-controls-switchbar-chart-icon-pie-with-depth-grey {    background-position: -88px -374px;}.viz-controls-switchbar-chart-icon-geo-bubble-grey {    background-position: -88px -408px;}.viz-controls-switchbar-chart-icon-geo-choropleth-grey {    background-position: -88px -442px;}.viz-controls-switchbar-chart-icon-geo-pie-grey {    background-position: -88px -476px;}.viz-controls-switchbar-chart-icon-geo-map-grey {    background-position: -88px -510px;}.viz-controls-switchbar-chart-icon-scatter-grey {    background-position: -88px -544px;}.viz-controls-switchbar-chart-icon-bubble-grey {    background-position: -88px -578px;}.viz-controls-switchbar-chart-icon-scatter-matrix-grey {    background-position: -88px -612px;}.viz-controls-switchbar-chart-icon-heatmap-grey {    background-position: -88px -646px;}.viz-controls-switchbar-chart-icon-treemap-grey {    background-position: -88px -680px;}.viz-controls-switchbar-chart-icon-table-grey {    background-position: -88px -714px;}.viz-controls-switchbar-chart-icon-radar-grey {    background-position: -88px -748px;}.viz-controls-switchbar-chart-icon-boxplot-grey {    background-position: -88px -782px;}.viz-controls-switchbar-chart-icon-waterfall-grey {    background-position: -88px -816px;}.viz-controls-switchbar-chart-icon-tag-cloud-grey {    background-position: -88px -850px;}.viz-controls-switchbar-chart-icon-tree-grey {    background-position: -88px -884px;}.viz-controls-switchbar-chart-icon-network-grey {    background-position: -88px -918px;}.viz-controls-switchbar-chart-icon-funnel-grey {    background-position: -88px -952px;}.viz-controls-switchbar-chart-icon-pc-grey {    background-position: -88px -986px;}.viz-controls-switchbar-chart-icon-extension-grey {    background-position: -88px -1020px;}.viz-controls-switchbar-chart-icon-bar-grey {    background-position: -88px -1054px;}.viz-controls-switchbar-chart-icon-stacked-bar-grey {    background-position: -88px -1088px;}.viz-controls-switchbar-chart-icon-dual-bar-grey {    background-position: -88px -1122px;}.viz-controls-switchbar-dropdown-arrow {    float: left;    background-color: transparent !important;}.viz-controls-switchbar-dropdown-arrow-icon {    background-position: 0px -362px;    margin: 8px 2px 10px 3px;}.viz-controls-switchbar-chart-selected .viz-controls-switchbar-dropdown-arrow-icon {    background-position: -17px -362px;}.viz-controls-switchbar-chart-selected .viz-controls-switchbar-splitter {    background-color: #ffffff;}.viz-controls-switchbar-splitter {    height: 74%;    width: 1px;    position: absolute;    background-color: #bfbfbf;    left: 38px;    top: 13%;    visibility: hidden;}.viz-controls-switchbar-switcher:hover .viz-controls-switchbar-splitter {    visibility: visible;}.viz-controls-chartPopover{  height: auto;  font-size: 0.875rem;}.viz-controls-chartPopover .sapUiIcon{  border : none;}.viz-controls-chartPopover .viz-controls-chartPopover-measures-list{  padding: 0;}.viz-controls-chartPopover .viz-controls-chartPopover-measures-item{  padding : 0;  border-bottom: none;  line-height: 1.4375rem;  height: 1.4375rem;}.viz-controls-chartPopover .viz-controls-chartPopover-measures-item .sapMLIBContent{  line-height: 1.4375rem;}.viz-controls-chartPopover .sapMPanelContent{  margin: 0.4375rem 0.688rem;  padding: 0;  border-bottom: none;  line-height: 0rem;}.viz-controls-chartPopover .viz-controls-chartPopover-dimension-marker{  line-height: 1.4375rem;  margin-right: 0.625rem;  float: left;}.viz-controls-chartPopover .viz-controls-chartPopover-vizSelectedBar{  margin: 0 0.688rem;  width: 92%;  background-color: #ffffff;  box-shadow: none;}.viz-controls-chartPopover .viz-controls-chartPopover-vizSelectedBar .sapMLabel{  color: #000000;}.viz-controls-chartPopover .viz-controls-chartPopover-vizSelectedBarBorder{  border-top: 1px rgba(153,153,153,0.6) solid;}.viz-controls-chartPopover .viz-controls-chartPopover-actionList li:first-child{  border-top: 1px rgb(229, 229, 229) solid;}.viz-controls-dedicatedLegend svg{  margin: 0.4375rem 0.688rem 0.125rem 0.688rem;}.viz-controls-datapicker-area {    width: 100%;    height: 100%;    background:#fff;}.viz-controls-datapicker-main-layout {    position: absolute;    top: 0;    bottom: 0;    width: 100%;    z-index: 100;}.viz-controls-datapicker-facet-type-toggle {    height: 100%;    float: left;}.viz-controls-datapicker-side-panel-container {    height: 100%;    float: right;}.viz-controls-datapicker-facet-analytic-split-pane {    box-shadow: 0 0 6px 2px rgba(0, 0, 0, 0.1);    height: 100%;    overflow: hidden;}.viz-controls-datapicker-h1 {    font-size: 24px;    font-weight: normal;}.viz-controls-datapicker-h2 {    font-size: 14px;    font-weight: normal;}.viz-controls-datapicker-h3 {    font-size: 12px;    font-weight: bold;    letter-spacing: 0.01em;}.viz-controls-datapicker-h4 {    font-size: 12px;    font-weight: bold;}.viz-controls-datapicker-uppercase {    text-transform: uppercase;}.viz-controls-datapicker-text-overflow-ellipsis {    overflow: hidden;    text-overflow: ellipsis;    white-space: nowrap;}.viz-controls-datapicker-normal-text {    font-size: 12px;    font-weight: normal;}.viz-controls-datapicker-small-text {    color: #666;    font-size: 11px;    font-weight: bold;}.viz-controls-datapicker-allow-select {    -webkit-user-select: text;    -khtml-user-select: text;    -moz-user-select: text;    -ms-user-select: text;    user-select: text;}.viz-controls-datapicker-float-left {    float: left;}.viz-controls-datapicker-float-right {    float: right;}.viz-controls-datapicker-clearfix:after {    content: ' ';    display: block;    height: 0;    clear: both;    visibility: hidden;}.viz-controls-datapicker-explorer.viz-controls-datapicker-viewmode .viz-controls-datapicker-facet-type-toggle, .viz-controls-datapicker-explorer.viz-controls-datapicker-viewmode .viz-controls-datapicker-side-panel-container, .viz-controls-datapicker-explorer.viz-controls-datapicker-viewmode .viz-controls-datapicker-facet-analytic-split-pane .viz-controls-datapicker-split-pane-first, .viz-controls-datapicker-explorer.viz-controls-datapicker-viewmode.viz-controls-datapicker-facet-analytic-split-pane .viz-controls-datapicker-split-pane-splitter, .viz-controls-datapicker-explorer.viz-controls-datapicker-viewmode .viz-controls-datapicker-facet-analytic-split-pane.viz-controls-datapicker-split-pane-splitter-hit-box {    display: none;}.viz-controls-datapicker-generated-title-bold {    font-weight: bold;    color: #404040;}.viz-controls-datapicker-generated-title-more {    font-weight: bold;    color: #c0c0c0;}.viz-controls-datapicker-tooltip-parent {    position: absolute;    overflow: hidden;    top: 0;    left: 0;    width: 100%;    height: 100%;}.viz-controls-datapicker-tooltip-container {    position: absolute;    top: 0;    left: 0;    width: 100%;    height: 100%;    padding-right: 450px;}.viz-controls-datapicker-gripper-vertical-icon-10,.viz-controls-datapicker-gripper-vertical-active-icon-10,.viz-controls-datapicker-plus-icon-12,.viz-controls-datapicker-minus-icon-12,.viz-controls-datapicker-checkbox-inactive-icon-16,.viz-controls-datapicker-checkbox-active-icon-16,.viz-controls-datapicker-checkbox-selected-icon-16,.viz-controls-datapicker-checkbox-active-selected-icon-16,.viz-controls-datapicker-accept-icon-16,.viz-controls-datapicker-deny-icon-16,.viz-controls-datapicker-reload-icon-16,.viz-controls-datapicker-check-icon-16,.viz-controls-datapicker-check-transparent-icon-16,.viz-controls-datapicker-geo-icon-16,.viz-controls-datapicker-hierarchy-icon-16,.viz-controls-datapicker-geo-active-icon-16,.viz-controls-datapicker-hierarchy-active-icon-16,.viz-controls-datapicker-plus-icon-16,.viz-controls-datapicker-plus-active-icon-16,.viz-controls-datapicker-minus-icon-16,.viz-controls-datapicker-minus-active-icon-16,.viz-controls-datapicker-plus-disabled-icon-16,.viz-controls-datapicker-x-icon-16,.viz-controls-datapicker-x-active-icon-16,.viz-controls-datapicker-x-disabled-icon-16,.viz-controls-datapicker-plus-circle-icon-16,.viz-controls-datapicker-plus-circle-active-icon-16,.viz-controls-datapicker-dataset-icon-24,.viz-controls-datapicker-dataset-modification-icon-24,.viz-controls-datapicker-fullscreen-exit-icon-24,.viz-controls-datapicker-fullscreen-enter-icon-24,.viz-controls-datapicker-fullscreen-exit-active-icon-24,.viz-controls-datapicker-fullscreen-enter-active-icon-24,.viz-controls-datapicker-checker-icon-24,.viz-controls-datapicker-filter-icon-24,.viz-controls-datapicker-filter-active-icon-24,.viz-controls-datapicker-plus-icon-24,.viz-controls-datapicker-plus-active-icon-24,.viz-controls-datapicker-minus-icon-24,.viz-controls-datapicker-minus-active-icon-24,.viz-controls-datapicker-marquee-icon-24,.viz-controls-datapicker-marquee-active-icon-24,.viz-controls-datapicker-reset-icon-24,.viz-controls-datapicker-reset-active-icon-24,.viz-controls-datapicker-accept-icon-32,.viz-controls-datapicker-deny-icon-32,.viz-controls-datapicker-delete-icon-32,.viz-controls-datapicker-reload-icon-32,.viz-controls-datapicker-vertical-layout-icon-32,.viz-controls-datapicker-vertical-layout-active-icon-32,.viz-controls-datapicker-horizontal-layout-icon-32,.viz-controls-datapicker-horizontal-layout-active-icon-32,.viz-controls-datapicker-text-icon-32,.viz-controls-datapicker-text-active-icon-32,.viz-controls-datapicker-bar-icon-32,.viz-controls-datapicker-bar-active-icon-32,.viz-controls-datapicker-dot-icon-32,.viz-controls-datapicker-dot-active-icon-32,.viz-controls-datapicker-line-icon-32,.viz-controls-datapicker-line-active-icon-32,.viz-controls-datapicker-tile-icon-32,.viz-controls-datapicker-tile-active-icon-32,.viz-controls-datapicker-geo-icon-32,.viz-controls-datapicker-geo-active-icon-32,.viz-controls-datapicker-spread-active-icon-32,.viz-controls-datapicker-spread-icon-32,.viz-controls-datapicker-group-active-icon-32,.viz-controls-datapicker-group-icon-32,.viz-controls-datapicker-stacked-active-icon-32,.viz-controls-datapicker-stacked-icon-32,.viz-controls-datapicker-crosstab-icon-32,.viz-controls-datapicker-crosstab-active-icon-32,.viz-controls-datapicker-bar-chart-icon-48,.viz-controls-datapicker-dot-plot-chart-icon-48,.viz-controls-datapicker-strip-plot-chart-icon-48,.viz-controls-datapicker-heat-map-chart-icon-48,.viz-controls-datapicker-size-comparison-chart-icon-48,.viz-controls-datapicker-geo-bubble-chart-icon-48,.viz-controls-datapicker-tag-cloud-chart-icon-48,.viz-controls-datapicker-table-icon-48,.viz-controls-datapicker-stacked-bar-chart-icon-48,.viz-controls-datapicker-pie-chart-icon-48,.viz-controls-datapicker-tree-map-icon-48,.viz-controls-datapicker-line-chart-icon-48,.viz-controls-datapicker-area-chart-icon-48,.viz-controls-datapicker-scatter-plot-chart-icon-48,.viz-controls-datapicker-bubble-plot-chart-icon-48,.viz-controls-datapicker-custom-chart-icon-48{background-image:url(../common/assets/UVB_VxtabSprite.png);background-color:transparent;background-repeat:no-repeat;}@media only screen and (-webkit-min-device-pixel-ratio: 1.5),only screen and (min--moz-device-pixel-ratio: 1.5),only screen and (-o-min-device-pixel-ratio: 3/2),only screen and (min-device-pixel-ratio: 1.5){.viz-controls-datapicker-gripper-vertical-icon-10,.viz-controls-datapicker-gripper-vertical-active-icon-10,.viz-controls-datapicker-plus-icon-12,.viz-controls-datapicker-minus-icon-12,.viz-controls-datapicker-checkbox-inactive-icon-16,.viz-controls-datapicker-checkbox-active-icon-16,.viz-controls-datapicker-checkbox-selected-icon-16,.viz-controls-datapicker-checkbox-active-selected-icon-16,.viz-controls-datapicker-accept-icon-16,.viz-controls-datapicker-deny-icon-16,.viz-controls-datapicker-reload-icon-16,.viz-controls-datapicker-check-icon-16,.viz-controls-datapicker-check-transparent-icon-16,.viz-controls-datapicker-geo-icon-16,.viz-controls-datapicker-hierarchy-icon-16,.viz-controls-datapicker-geo-active-icon-16,.viz-controls-datapicker-hierarchy-active-icon-16,.viz-controls-datapicker-plus-icon-16,.viz-controls-datapicker-plus-active-icon-16,.viz-controls-datapicker-minus-icon-16,.viz-controls-datapicker-minus-active-icon-16,.viz-controls-datapicker-plus-disabled-icon-16,.viz-controls-datapicker-x-icon-16,.viz-controls-datapicker-x-active-icon-16,.viz-controls-datapicker-x-disabled-icon-16,.viz-controls-datapicker-plus-circle-icon-16,.viz-controls-datapicker-plus-circle-active-icon-16,.viz-controls-datapicker-dataset-icon-24,.viz-controls-datapicker-dataset-modification-icon-24,.viz-controls-datapicker-fullscreen-exit-icon-24,.viz-controls-datapicker-fullscreen-enter-icon-24,.viz-controls-datapicker-fullscreen-exit-active-icon-24,.viz-controls-datapicker-fullscreen-enter-active-icon-24,.viz-controls-datapicker-checker-icon-24,.viz-controls-datapicker-filter-icon-24,.viz-controls-datapicker-filter-active-icon-24,.viz-controls-datapicker-plus-icon-24,.viz-controls-datapicker-plus-active-icon-24,.viz-controls-datapicker-minus-icon-24,.viz-controls-datapicker-minus-active-icon-24,.viz-controls-datapicker-marquee-icon-24,.viz-controls-datapicker-marquee-active-icon-24,.viz-controls-datapicker-reset-icon-24,.viz-controls-datapicker-reset-active-icon-24,.viz-controls-datapicker-accept-icon-32,.viz-controls-datapicker-deny-icon-32,.viz-controls-datapicker-delete-icon-32,.viz-controls-datapicker-reload-icon-32,.viz-controls-datapicker-vertical-layout-icon-32,.viz-controls-datapicker-vertical-layout-active-icon-32,.viz-controls-datapicker-horizontal-layout-icon-32,.viz-controls-datapicker-horizontal-layout-active-icon-32,.viz-controls-datapicker-text-icon-32,.viz-controls-datapicker-text-active-icon-32,.viz-controls-datapicker-bar-icon-32,.viz-controls-datapicker-bar-active-icon-32,.viz-controls-datapicker-dot-icon-32,.viz-controls-datapicker-dot-active-icon-32,.viz-controls-datapicker-line-icon-32,.viz-controls-datapicker-line-active-icon-32,.viz-controls-datapicker-tile-icon-32,.viz-controls-datapicker-tile-active-icon-32,.viz-controls-datapicker-geo-icon-32,.viz-controls-datapicker-geo-active-icon-32,.viz-controls-datapicker-spread-active-icon-32,.viz-controls-datapicker-spread-icon-32,.viz-controls-datapicker-group-active-icon-32,.viz-controls-datapicker-group-icon-32,.viz-controls-datapicker-stacked-active-icon-32,.viz-controls-datapicker-stacked-icon-32,.viz-controls-datapicker-crosstab-icon-32,.viz-controls-datapicker-crosstab-active-icon-32,.viz-controls-datapicker-bar-chart-icon-48,.viz-controls-datapicker-dot-plot-chart-icon-48,.viz-controls-datapicker-strip-plot-chart-icon-48,.viz-controls-datapicker-heat-map-chart-icon-48,.viz-controls-datapicker-size-comparison-chart-icon-48,.viz-controls-datapicker-geo-bubble-chart-icon-48,.viz-controls-datapicker-tag-cloud-chart-icon-48,.viz-controls-datapicker-table-icon-48,.viz-controls-datapicker-stacked-bar-chart-icon-48,.viz-controls-datapicker-pie-chart-icon-48,.viz-controls-datapicker-tree-map-icon-48,.viz-controls-datapicker-line-chart-icon-48,.viz-controls-datapicker-area-chart-icon-48,.viz-controls-datapicker-scatter-plot-chart-icon-48,.viz-controls-datapicker-bubble-plot-chart-icon-48,.viz-controls-datapicker-custom-chart-icon-48{background-image:url(../common/assets/havana-vxtab-sprite-2x.png);background-color:transparent;background-repeat:no-repeat;-moz-background-size:146px 1580px;-ie-background-size:146px 1580px;-o-background-size:146px 1580px;-webkit-background-size:146px 1580px;background-size:146px 1580px;}}.viz-controls-datapicker-gripper-vertical-icon-10,.viz-controls-datapicker-gripper-vertical-active-icon-10 {    width:10px;height:10px;}.viz-controls-datapicker-plus-icon-12, .viz-controls-datapicker-minus-icon-12 {    width: 12px;    height: 12px;}.viz-controls-datapicker-checkbox-inactive-icon-16, .viz-controls-datapicker-checkbox-active-icon-16, .viz-controls-datapicker-checkbox-selected-icon-16, .viz-controls-datapicker-checkbox-active-selected-icon-16, .viz-controls-datapicker-accept-icon-16, .viz-controls-datapicker-deny-icon-16, .viz-controls-datapicker-reload-icon-16, .viz-controls-datapicker-check-icon-16, .viz-controls-datapicker-check-transparent-icon-16, .viz-controls-datapicker-geo-icon-16, .viz-controls-datapicker-hierarchy-icon-16, .viz-controls-datapicker-geo-active-icon-16, .viz-controls-datapicker-hierarchy-active-icon-16, .viz-controls-datapicker-plus-icon-16, .viz-controls-datapicker-plus-active-icon-16, .viz-controls-datapicker-minus-icon-16, .viz-controls-datapicker-minus-active-icon-16, .viz-controls-datapicker-plus-disabled-icon-16, .viz-controls-datapicker-x-icon-16, .viz-controls-datapicker-x-active-icon-16, .viz-controls-datapicker-x-disabled-icon-16, .viz-controls-datapicker-plus-circle-icon-16, .viz-controls-datapicker-plus-circle-active-icon-16 {    width: 16px;    height: 16px;}.viz-controls-datapicker-dataset-icon-24, .viz-controls-datapicker-dataset-modification-icon-24, .viz-controls-datapicker-fullscreen-exit-icon-24, .viz-controls-datapicker-fullscreen-enter-icon-24, .viz-controls-datapicker-fullscreen-exit-active-icon-24, .viz-controls-datapicker-fullscreen-enter-active-icon-24, .viz-controls-datapicker-checker-icon-24, .viz-controls-datapicker-filter-icon-24, .viz-controls-datapicker-filter-active-icon-24, .viz-controls-datapicker-plus-icon-24, .viz-controls-datapicker-plus-active-icon-24, .viz-controls-datapicker-minus-icon-24, .viz-controls-datapicker-minus-active-icon-24, .viz-controls-datapicker-marquee-icon-24, .viz-controls-datapicker-marquee-active-icon-24, .viz-controls-datapicker-reset-icon-24, .viz-controls-datapicker-reset-active-icon-24 {    width: 24px;    height: 24px;}.viz-controls-datapicker-accept-icon-32, .viz-controls-datapicker-deny-icon-32, .viz-controls-datapicker-delete-icon-32, .viz-controls-datapicker-reload-icon-32, .viz-controls-datapicker-vertical-layout-icon-32, .viz-controls-datapicker-vertical-layout-active-icon-32, .viz-controls-datapicker-horizontal-layout-icon-32, .viz-controls-datapicker-horizontal-layout-active-icon-32, .viz-controls-datapicker-text-icon-32, .viz-controls-datapicker-text-active-icon-32, .viz-controls-datapicker-bar-icon-32, .viz-controls-datapicker-bar-active-icon-32, .viz-controls-datapicker-dot-icon-32, .viz-controls-datapicker-dot-active-icon-32, .viz-controls-datapicker-line-icon-32, .viz-controls-datapicker-line-active-icon-32, .viz-controls-datapicker-tile-icon-32, .viz-controls-datapicker-tile-active-icon-32, .viz-controls-datapicker-geo-icon-32, .viz-controls-datapicker-geo-active-icon-32, .viz-controls-datapicker-spread-active-icon-32, .viz-controls-datapicker-spread-icon-32, .viz-controls-datapicker-group-active-icon-32, .viz-controls-datapicker-group-icon-32, .viz-controls-datapicker-stacked-active-icon-32, .viz-controls-datapicker-stacked-icon-32, .viz-controls-datapicker-crosstab-icon-32, .viz-controls-datapicker-crosstab-active-icon-32 {    width: 32px;    height: 32px;}.viz-controls-datapicker-bar-chart-icon-48, .viz-controls-datapicker-dot-plot-chart-icon-48, .viz-controls-datapicker-strip-plot-chart-icon-48, .viz-controls-datapicker-heat-map-chart-icon-48, .viz-controls-datapicker-size-comparison-chart-icon-48, .viz-controls-datapicker-geo-bubble-chart-icon-48, .viz-controls-datapicker-tag-cloud-chart-icon-48, .viz-controls-datapicker-table-icon-48, .viz-controls-datapicker-stacked-bar-chart-icon-48, .viz-controls-datapicker-pie-chart-icon-48, .viz-controls-datapicker-tree-map-icon-48, .viz-controls-datapicker-line-chart-icon-48, .viz-controls-datapicker-area-chart-icon-48, .viz-controls-datapicker-scatter-plot-chart-icon-48, .viz-controls-datapicker-bubble-plot-chart-icon-48, .viz-controls-datapicker-custom-chart-icon-48 {    width: 48px;    height: 48px;}.viz-controls-datapicker-dataset-icon-24 {    background-position: 0px 0px;}.viz-controls-datapicker-core-x-icon-8,.viz-controls-datapicker-core-x-active-icon-8 {    width:8px;height:8px;}.viz-controls-datapicker-core-checkmark-icon-10, .viz-controls-datapicker-core-checkmark-active-icon-10, .viz-controls-datapicker-core-checkmark-focus-icon-10 {    width: 10px;    height: 10px;}.viz-controls-datapicker-core-search-icon-16, .viz-controls-datapicker-core-caret-right-icon-16 {    width: 16px;    height: 16px;}.viz-controls-datapicker-core-search-icon-16 {    background-position: 0px -157px;}.viz-controls-datapicker-core-caret-right-icon-16 {    background-position: -119px -362px;}.viz-controls-datapicker-scrollable-x, .viz-controls-datapicker-scrollable-y, .viz-controls-datapicker-scrollable-hover-x, .viz-controls-datapicker-scrollable-hover-y {    overflow: hidden;}.viz-controls-datapicker-scrollable-x, .viz-controls-datapicker-scrollable-hover-x.viz-controls-datapicker-hover, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-scrollable-hover-x:hover {    overflow-x: auto !important;}.viz-controls-datapicker-scrollable-y, .viz-controls-datapicker-scrollable-hover-y.viz-controls-datapicker-hover, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-scrollable-hover-y:hover {    overflow-y: auto !important;}.viz-controls-datapicker-scrollable {    scrollbar-arrow-color: #FFF;    scrollbar-face-color: #bfbfbf;    scrollbar-track-color: #FFF;    scrollbar-base-color: #FFF;    scrollbar-darkshadow-color: #FFF;    scrollbar-shadow-color: #FFF;    -webkit-overflow-scrolling: touch;}.viz-controls-datapicker-scrollable-scrollContainerRotateResizeFix .viz-controls-datapicker-scrollable {    -webkit-overflow-scrolling: auto;}.viz-controls-datapicker-scrollable-scrollContainerRotateResizeFix .viz-controls-datapicker-scrollable::-webkit-scrollbar {    display: none;}.viz-controls-datapicker-scrollwindow, .viz-controls-datapicker-scrollwindow-sizer, .viz-controls-datapicker-scrollwindow-content {    background: #fff;    position: relative;    overflow: hidden;    width: 100%;    height: 100%;}.viz-controls-datapicker-scrollwindow-content {    position: absolute;}.viz-controls-datapicker-scrollwindow-truncatedmsg {    position: absolute;    display: block;    width: 100%;    bottom: 0;    font-style: italic;    font-size: 70%;    text-align: center;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-button:hover {    border: 1px solid #BFBFBF;    color: #666;    -webkit-box-shadow: 0px 1px 0px 1px rgba(0, 0, 0, 0.1);    box-shadow: 0px 1px 0px 1px rgba(0, 0, 0, 0.1);    background: #f2f2f2;    background: -moz-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -webkit-gradient(linear, left top, left bottom, color-stop(8%, #f2f2f2), color-stop(100%, #fafafa));    background: -webkit-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -o-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -ms-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: linear-gradient(to bottom, #f2f2f2 8%, #fafafa 100%);}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-button-cancel:hover {    color: #007cc0;}.viz-controls-datapicker-core-shell {}.viz-controls-datapicker-core-shell select, .viz-controls-datapicker-core-shell button, .viz-controls-datapicker-core-shell input {    color: #333;    font: inherit;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;    vertical-align: baseline;    border-radius: 0;    border: 0;    margin: 0;    padding: 0;}.viz-controls-datapicker-core-shell select::-moz-focus-inner, .viz-controls-datapicker-core-shell button::-moz-focus-inner, .viz-controls-datapicker-core-shell input::-moz-focus-inner {    border: 0;}.viz-controls-datapicker-core-shell select:focus, .viz-controls-datapicker-core-shell button:focus, .viz-controls-datapicker-core-shell input:focus {    outline: 0;}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button, .viz-controls-datapicker-core-shell button, .viz-controls-datapicker-core-shell input[type=button] {    padding: 1px 6px;}.viz-controls-datapicker-core-shell input:not([type]), .viz-controls-datapicker-core-shell input[type='color'], .viz-controls-datapicker-core-shell input[type='email'], .viz-controls-datapicker-core-shell input[type='number'], .viz-controls-datapicker-core-shell input[type='password'], .viz-controls-datapicker-core-shell input[type='tel'], .viz-controls-datapicker-core-shell input[type='url'], .viz-controls-datapicker-core-shell input[type='text'], .viz-controls-datapicker-core-shell textarea, .viz-controls-datapicker-core-shell select {    background-color: #FFF;    border: 1px solid #DDD;    border-radius: 0;}.viz-controls-datapicker-core-shell textarea {    resize: none;    outline: none;    overflow-y: auto;}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button {    border-radius: 3px;    border: 1px solid #BFBFBF;    color: #666;    -webkit-box-shadow: none;    box-shadow: none;    cursor: pointer;    background: #ffffff;    background: -moz-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    background: -webkit-gradient(linear, left top, left bottom, color-stop(80%, #ffffff), color-stop(100%, #f2f2f2));    background: -webkit-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    background: -o-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    background: -ms-linear-gradient(top, #ffffff 80%, #f2f2f2 100%);    background: linear-gradient(to bottom, #ffffff 80%, #f2f2f2 100%);}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button[disabled], .viz-controls-datapicker-core-shell .viz-controls-datapicker-button.viz-controls-datapicker-disabled, .viz-controls-datapicker-core-shell .viz-controls-datapicker-button:active {    background: #f2f2f2;    background: -moz-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -webkit-gradient(linear, left top, left bottom, color-stop(8%, #f2f2f2), color-stop(100%, #fafafa));    background: -webkit-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -o-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: -ms-linear-gradient(top, #f2f2f2 8%, #fafafa 100%);    background: linear-gradient(to bottom, #f2f2f2 8%, #fafafa 100%);}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button.viz-controls-datapicker-depressed {    border: 1px solid #008fd3;    color: #FFF;    -webkit-box-shadow: inset 0px 0px 2px 2px rgba(0, 143, 211, 0.15);    box-shadow: inset 0px 0px 2px 2px rgba(0, 143, 211, 0.15);    background: #3ab0e9;    background: -moz-linear-gradient(top, #3ab0e9 8%, #74b6e2 100%);    background: -webkit-gradient(linear, left top, left bottom, color-stop(8%, #3ab0e9), color-stop(100%, #74b6e2));    background: -webkit-linear-gradient(top, #3ab0e9 8%, #74b6e2 100%);    background: -o-linear-gradient(top, #3ab0e9 8%, #74b6e2 100%);    background: -ms-linear-gradient(top, #3ab0e9 8%, #74b6e2 100%);    background: linear-gradient(to bottom, #3ab0e9 8%, #74b6e2 100%);}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button:active {    border: 1px solid #BFBFBF;    color: #666;    -webkit-box-shadow: inset 0px 0px 2px 2px rgba(0, 0, 0, 0.15);    box-shadow: inset 0px 0px 2px 2px rgba(0, 0, 0, 0.15);}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button[disabled], .viz-controls-datapicker-core-shell .viz-controls-datapicker-button.viz-controls-datapicker-disabled {    border: 1px solid #DDDDDD;    color: #BFBFBF;    -webkit-box-shadow: none;    box-shadow: none;    cursor: default;}.viz-controls-datapicker-core-shell .viz-controls-datapicker-button-cancel {    border: none;    cursor: pointer;    color: rgba(0, 124, 192, 0.6);    background-color: transparent;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-search-box {    margin: 0 8px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-search-box .viz-controls-datapicker-search-box-input {    font-size: 14px;    height: 34px;}.viz-controls-datapicker-search-box {    position: relative;    margin: 0 4px;}.viz-controls-datapicker-search-box .viz-controls-datapicker-search-box-input {    width: 182px;    padding: 3px 24px 3px 3px;    border: 1px solid #CCCCCC;    -webkit-appearance: none;}.viz-controls-datapicker-search-box .viz-controls-datapicker-search-box-input:hover {    border-color:#007CC0;}.viz-controls-datapicker-search-box .viz-controls-datapicker-search-box-clear-button {    position: absolute;    top: 6px;    right: 6px;    cursor: pointer;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button:hover .viz-controls-datapicker-core-cog-icon-16, .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button:active .viz-controls-datapicker-core-cog-icon-16, .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button.viz-controls-datapicker-menu-open .viz-controls-datapicker-core-cog-icon-16 {    background-position: -34px -303px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button:hover .viz-controls-datapicker-core-cog-icon-24, .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button:active .viz-controls-datapicker-core-cog-icon-24, .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button.viz-controls-datapicker-menu-open .viz-controls-datapicker-core-cog-icon-24 {    background-position: -50px -320px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-search-button:hover .viz-controls-datapicker-core-search-icon-16, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-core-search-icon-16:hover, .viz-controls-datapicker-show-search .viz-controls-datapicker-core-search-icon-16, .viz-controls-datapicker-facet-search-button:active .viz-controls-datapicker-core-search-icon-16, .viz-controls-datapicker-core-search-icon-16:active {    background-position: -17px -157px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-core-search-icon-24:hover, .viz-controls-datapicker-show-search .viz-controls-datapicker-core-search-icon-24, .viz-controls-datapicker-facet-search-button:active .viz-controls-datapicker-core-search-icon-24, .viz-controls-datapicker-core-search-icon-24:active {    background-position: -25px -892px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-header-back-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-left-icon-16:hover, .viz-controls-datapicker-facet-header-back-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-left-icon-16:active {    background-position: -51px -362px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-drill-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-right-icon-16:hover, .viz-controls-datapicker-facet-member-drill-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-right-icon-16:active {    background-position: -102px -362px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16:hover, .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16:active {    background-position: -51px -1101px;}.viz-controls-datapicker-hierarchy-icon-16{    background-position: 0px -1632px;}.viz-controls-datapicker-hierarchy-active-icon-16{    background-position: -17px -1632px;}.viz-controls-datapicker-core-support-mouse, .viz-controls-datapicker-facet-member-expand-button, .viz-controls-datapicker-plus-icon-16:hover, .viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-plus-icon-16:active {    background-position: 0px -1118px;}.viz-controls-datapicker-plus-icon-16{    background-position: 0px -1118px;}.viz-controls-datapicker-minus-active-icon-16{    background-position: -51px -1118px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-menu-button:hover {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-token-draggable.viz-controls-datapicker-facet-token:hover {    cursor: move;    background: #858585;    background: rgba(102, 102, 102, 0.8);    border: 1px solid #555555;    box-shadow: 1px 1px 5px 0px rgba(0, 0, 0, 0.3);    border-radius: 3px;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-token-draggable.viz-controls-datapicker-facet-token:hover .viz-controls-datapicker-facet-token-label {    color: #FFFFFF;    cursor: move;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-plus-icon-16:hover, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16:hover, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-drill-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-right-icon-16:hover, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-header-back-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-left-icon-16:hover {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-highlighting:hover {    background-color: #3ea1d7;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-highlighting:hover label, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-highlighting:hover span {    color: #FFFFFF;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member-highlighting:hover span.viz-controls-datapicker-facet-bubble {    color: #666666;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-show-secondary:not(.viz-controls-datapicker-show-search):hover .viz-controls-datapicker-facet-members {    z-index: 20;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-show-secondary:not(.viz-controls-datapicker-show-search):hover .viz-controls-datapicker-facet-members.viz-controls-datapicker-facet-members-secondary {    z-index: 10;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member {    height: 34px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-header {    height: 36px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-header-sub-title {    line-height: 36px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-bubble {    top: 11px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-members {    top: 36px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-show-search > .viz-controls-datapicker-facet-members {    top: 70px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-token {    height: 30px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-token-label {    line-height: 30px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member-value {    line-height: 32px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member .viz-controls-datapicker-facet-bubble {    top: 9px;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member-item {    height: 32px;}.viz-controls-datapicker-metadata-bar {    height: 70px;    overflow: hidden;    white-space: nowrap;    background-color: #FFF;    border-bottom: solid 1px #DDD;}.viz-controls-datapicker-metadata-bar .viz-controls-datapicker-view-name {    display: block;    padding: 10px 0;    cursor:default;}.viz-controls-datapicker-metadata-bar .viz-controls-datapicker-dataset-icon-24 {    float: left;    margin: 6px 6px;}.viz-controls-datapicker-facet-container {    position: absolute;    top: 37px;    bottom: 0;    left: 0;    right: 0;}.viz-controls-datapicker-metadata-bar+ .viz-controls-datapicker-facet-container {    top: 37px;}.viz-controls-datapicker-facet-area {    width: 100%;    height: 100%;    overflow: hidden;}.viz-controls-datapicker-facet-area .viz-controls-datapicker-facet {    width: 240px;    display: inline-block;    vertical-align: top;}.viz-controls-datapicker-facet-area-vertical .viz-controls-datapicker-facet {    width: auto;    display: block;}.viz-controls-datapicker-facet-area-vertical .viz-controls-datapicker-facet:first-child {    height: 34%;}.viz-controls-datapicker-facet-area-vertical .viz-controls-datapicker-facet:last-child {    border-top: 1px solid #DDDDDD;    height: 66%;}.viz-controls-datapicker-facet-area-vertical .viz-controls-datapicker-facet:only-child {    border: 0;    height: 100%;}.viz-controls-datapicker-facet-area-hide-item-menus .viz-controls-datapicker-facet-member .viz-controls-datapicker-facet-menu-button {    display: none;}.viz-controls-datapicker-facet-area-horizontal .viz-controls-datapicker-facet {    border-right: 1px solid #DDDDDD;}.viz-controls-datapicker-facet-area-horizontal .viz-controls-datapicker-facet-area-content {    border-bottom: 1px solid #DDDDDD;}.viz-controls-datapicker-facet-area-content {    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-datapicker-facet {    position: relative;    display: block;    height: 100%;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-datapicker-facet .viz-controls-datapicker-search-box {    display: none;}.viz-controls-datapicker-facet.viz-controls-datapicker-show-search .viz-controls-datapicker-search-box {    display: block;}.viz-controls-datapicker-facet:not(.viz-controls-datapicker-facet-show-sub-title) .viz-controls-datapicker-facet-member-highlighting .viz-controls-datapicker-facet-token-label, .viz-controls-datapicker-facet.viz-controls-datapicker-facet-show-secondary .viz-controls-datapicker-facet-token-label {    max-width: 100%;}.viz-controls-datapicker-facet .viz-controls-datapicker-facet-token-label {    max-width: 120px;}.viz-controls-datapicker-facet-area.viz-controls-datapicker-selectable .viz-controls-datapicker-facet {    color: #666666;}.viz-controls-datapicker-facet-area.viz-controls-datapicker-selectable .viz-controls-datapicker-facet.viz-controls-datapicker-selected {    color: #333333;}.viz-controls-datapicker-facet-area.viz-controls-datapicker-selectable .viz-controls-datapicker-facet.viz-controls-datapicker-selected::after {    content: '';    display: block;    position: absolute;    top: 0;    left: 0;    right: 0;    bottom: 0;    box-shadow: inset 0px 0px 0px 1px #008fd3;    pointer-events: none;}.viz-controls-datapicker-facet-search-button {    margin: 2px;    padding: 2px;    border-radius: 3px;    border: 1px solid transparent;    visibility: hidden;    opacity: 0;    cursor: pointer;    -webkit-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -moz-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -ms-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -o-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    transition: visibility 0s linear 0.3s, opacity 0.3s linear;}.viz-controls-datapicker-core-support-vi-embedded .viz-controls-datapicker-facet-search-button {    -webkit-transition: none !important;    -moz-transition: none !important;    -ms-transition: none !important;    -o-transition: none !important;    transition: none !important;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-search-button, .viz-controls-datapicker-show-search .viz-controls-datapicker-facet-search-button, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet:hover .viz-controls-datapicker-facet-search-button {    visibility: visible;    opacity: 1;    -webkit-transition-delay: 0s;    -moz-transition-delay: 0s;    -ms-transition-delay: 0s;    -o-transition-delay: 0s;    transition-delay: 0s;}.viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-search-button:hover, .viz-controls-datapicker-facet-search-button:active, .viz-controls-datapicker-show-search .viz-controls-datapicker-facet-search-button {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-facet-menu-button {    margin: 2px;    padding: 2px;    border-radius: 3px;    border: 1px solid transparent;    float: right;    visibility: hidden;    opacity: 0;    cursor: pointer;    -webkit-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -moz-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -ms-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    -o-transition: visibility 0s linear 0.3s, opacity 0.3s linear;    transition: visibility 0s linear 0.3s, opacity 0.3s linear;}.viz-controls-datapicker-facet-menu-button:active, .viz-controls-datapicker-facet-menu-button.viz-controls-datapicker-menu-open {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-core-support-vi-embedded .viz-controls-datapicker-facet-menu-button {    -webkit-transition: none !important;    -moz-transition: none !important;    -ms-transition: none !important;    -o-transition: none !important;    transition: none !important;}.viz-controls-datapicker-facet-member-highlighting:active {    background-color: #3ea1d7;}.viz-controls-datapicker-facet-member-highlighting:active label, .viz-controls-datapicker-facet-member-highlighting:active span {    color: #FFFFFF;}.viz-controls-datapicker-facet-member-highlighting:active .viz-controls-datapicker-facet-bubble {    color: #666666;}.viz-controls-datapicker-facet-bubble-container {    position: relative;    display: block;    overflow: hidden;    padding: 0 4px;    height: 100%;    max-width: 100%;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-datapicker-facet-bubble {    position: relative;    line-height: 14px;    background-color: #F2F2F2;    border-radius: 3px;    padding: 0 4px;    vertical-align: top;    display: inline-block;    max-width: 100%;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-datapicker-facet .viz-controls-datapicker-facet-search-icon, .viz-controls-datapicker-facet .viz-controls-datapicker-gear-menu-icon {    display: block;    margin: 0;    padding: 0;    border: 0;    cursor: inherit;}.viz-controls-datapicker-facet .viz-controls-datapicker-parent-overlay {    white-space: normal;    word-wrap: break-word;    cursor: default;}.viz-controls-datapicker-facet .viz-controls-datapicker-parent-overlay p {    padding: 0 5px;    margin: 0;}.viz-controls-datapicker-facet .viz-controls-datapicker-parent-overlay.viz-controls-datapicker-facet-message p {    color: #808080;}.viz-controls-datapicker-facet ul {    list-style: none;    margin: 0;    padding: 0;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-header-sub-title {    display: block;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-member-value {    display: block;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-member-left {    float: left;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-header-left {    max-width: 33%;}.viz-controls-datapicker-facet-area-vertical .viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-header-left {    max-width: none;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-members .viz-controls-datapicker-facet-token-label {    max-width: 176px;}.viz-controls-datapicker-facet-show-sub-title .viz-controls-datapicker-facet-bubble-container {    max-width: 50%;}.viz-controls-datapicker-facet-show-back .viz-controls-datapicker-facet-header-back-button {    display: block;}.viz-controls-datapicker-facet-show-back .viz-controls-datapicker-facet-member {    padding-left: 30px;}.viz-controls-datapicker-facet-show-secondary:not(.viz-controls-datapicker-show-search):not(.viz-controls-datapicker-facet-has-mask) .viz-controls-datapicker-facet-members {    z-index: 10;}.viz-controls-datapicker-facet-show-secondary:not(.viz-controls-datapicker-show-search):not(.viz-controls-datapicker-facet-has-mask) .viz-controls-datapicker-facet-members.viz-controls-datapicker-facet-members-secondary {    z-index: 20;}.viz-controls-datapicker-facet-excluded .viz-controls-datapicker-facet-member-selected .viz-controls-datapicker-facet-token-label {    text-decoration: line-through;}.viz-controls-datapicker-facet-header {    height: 26px;    display: block;    position: relative;    white-space: nowrap;    cursor: default;    color: #333333;    background-color: #FFFFFF;}.viz-controls-datapicker-facet-header > li {    height: 100%;}.viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-token {    margin: 2px 0 2px 2px;}.viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-bubble {    top: 6px;}.viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-header-left {    max-width: 50%;}.viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-token-label {    max-width: 100%;}.viz-controls-datapicker-facet-header-right {    overflow: hidden;}.viz-controls-datapicker-facet-header-right-text {    height: 100%;    position: relative;    overflow: hidden;}.viz-controls-datapicker-facet-header-sub-title {    display: none;    font-weight: normal;    text-align: right;    overflow: hidden;    line-height: 26px;}.viz-controls-datapicker-facet-header-back-button {    width: 18px;    height: 100%;    display: none;    margin: 0 6px;    position: relative;}.viz-controls-datapicker-facet-header-back-button .viz-controls-datapicker-core-caret-left-icon-16 {    position: absolute;    top: 50%;    margin-top: -9px;    border: 1px solid transparent;    border-radius: 3px;    display: inline-block;    vertical-align: middle;    cursor: pointer;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-header-back-button {    padding: 0 8px;    margin: 0;}.viz-controls-datapicker-facet-header-back-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-left-icon-16:active {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-facet-header-hierarchy-indicator, .viz-controls-datapicker-facet-member-hierarchy-indicator, .viz-controls-datapicker-facet-member-geo-indicator {    width: 18px;    height: 100%;    margin-left: 4px;    position: relative;}.viz-controls-datapicker-facet-header-hierarchy-indicator .viz-controls-datapicker-hierarchy-active-icon-16, .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-active-icon-16, .viz-controls-datapicker-facet-header-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16, .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16 {    position: absolute;    top: 50%;    margin-top: -8px;}.viz-controls-datapicker-facet-member-hierarchy-indicator {    float: left;}.viz-controls-datapicker-facet-member-geo-indicator {    float : left;}.viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-active-icon-16, .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16 {    cursor: pointer;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member-hierarchy-indicator {    padding-left: 4px;    margin: 0;}.viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-active-icon-16, .viz-controls-datapicker-facet-member-hierarchy-indicator .viz-controls-datapicker-hierarchy-icon-16:active {    background-color: #007CC0;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-menu-button, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet:hover .viz-controls-datapicker-facet-header .viz-controls-datapicker-facet-menu-button, .viz-controls-datapicker-core-support-mouse .viz-controls-datapicker-facet-member:hover .viz-controls-datapicker-facet-menu-button, .viz-controls-datapicker-facet .viz-controls-datapicker-facet-menu-button.viz-controls-datapicker-menu-open {    visibility: visible;    opacity: 1;    -webkit-transition-delay: 0s;    -moz-transition-delay: 0s;    -ms-transition-delay: 0s;    -o-transition-delay: 0s;    transition-delay: 0s;}.viz-controls-datapicker-facet-members {    position: absolute;    overflow: hidden;    width: 100%;    bottom: 0;    background-color: #FFFFFF;}.viz-controls-datapicker-facet-member-list {    -webkit-transition-duration: 0.5s;    -moz-transition-duration: 0.5s;    -ms-transition-duration: 0.5s;    -o-transition-duration: 0.5s;    transition-duration: 0.5s;    -webkit-transform-style: preserve-3d;    -moz-transform-style: preserve-3d;    -ms-transform-style: preserve-3d;    -o-transform-style: preserve-3d;    transform-style: preserve-3d;    -webkit-backface-visibility: hidden;    -moz-backface-visibility: hidden;    -ms-backface-visibility: hidden;    -o-backface-visibility: hidden;    backface-visibility: hidden;    -webkit-transition-property: opacity;    -moz-transition-property: -moz-transform, opacity;    -ms-transition-property: -ms-transform, opacity;    -o-transition-property: -o-transform, opacity;    transition-property: transform, opacity;}.viz-controls-datapicker-flipped .viz-controls-datapicker-facet-member-list {    opacity: 0;    -moz-transform: rotateX(180deg);    -ms-transform: rotateX(180deg);    -o-transform: rotateX(180deg);    transform: rotateX(180deg);}.viz-controls-datapicker-facet-members {    top: 26px;    -webkit-transition: top 0.3s ease-out;    -moz-transition: top 0.3s ease-out;    -ms-transition: top 0.3s ease-out;    -o-transition: top 0.3s ease-out;    transition: top 0.3s ease-out;}.viz-controls-datapicker-show-search > .viz-controls-datapicker-facet-members {    top: 50px;}.viz-controls-datapicker-facet-member-item {    height: 22px;    border-top: 1px solid #FFFFFF;    border-bottom: 1px solid #FFFFFF;}.viz-controls-datapicker-facet-member-item.viz-controls-datapicker-facet-member-item-indent {    margin-left: 28px;}.viz-controls-datapicker-facet-member-item.viz-controls-datapicker-facet-member-selected {    background-color: rgba(0, 124, 192, 0.1);}.viz-controls-datapicker-facet-expandable .viz-controls-datapicker-facet-member {    margin-left: 22px;}.viz-controls-datapicker-facet-member {    height: 24px;    position: relative;    overflow: hidden;    white-space: nowrap;    cursor: default;}.viz-controls-datapicker-facet-member .viz-controls-datapicker-facet-menu-button {    margin: 0 4px 0 0;}.viz-controls-datapicker-facet-member .viz-controls-datapicker-facet-bubble {    top: 4px;}.viz-controls-datapicker-facet-member-left {    overflow: hidden;    height: 100%;    max-width: 100%;}.viz-controls-datapicker-facet-member-expand-button {    width: 18px;    height: 100%;    position: relative;    float: right;    margin-right: 8px;}.viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-plus-icon-16, .viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-minus-active-icon-16 {    position: absolute;    top: 50%;    margin-top: -8px;    cursor: pointer;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member-expand-button {    padding: 0 8px;    margin: 0;}.viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-minus-active-icon-16, .viz-controls-datapicker-facet-member-expand-button .viz-controls-datapicker-plus-icon-16:active {    background-color: #007CC0;}.viz-controls-datapicker-facet-member-drill-button {    width: 18px;    height: 100%;    margin-right: 8px;    position: relative;    float: right;}.viz-controls-datapicker-facet-member-drill-button .viz-controls-datapicker-core-caret-right-icon-16 {    position: absolute;    top: 50%;    margin-top: -9px;    border: 1px solid transparent;    border-radius: 3px;    cursor: pointer;}.viz-controls-datapicker-core-support-touch .viz-controls-datapicker-facet-member-drill-button {    padding: 0 8px;    margin: 0;}.viz-controls-datapicker-facet-member-drill-button:not(.viz-controls-datapicker-no-hover) .viz-controls-datapicker-core-caret-right-icon-16:active {    background-color: #3ea1d7;    border-color: #008fd3;}.viz-controls-datapicker-facet-token {    padding: 0 3px;    height: 22px;    max-width: 100%;    float: left;    border: 1px solid transparent;    border-radius: 3px;    margin-left: 0px;    -moz-box-sizing: border-box;    -webkit-box-sizing: border-box;    -ms-box-sizing: border-box;    box-sizing: border-box;}.viz-controls-datapicker-facet-token.ui-state-disabled {    opacity: 1;}.viz-controls-datapicker-facet-token-label {    display: inline-block;    line-height: 20px;    vertical-align: top;}.viz-controls-datapicker-facet-member-value {    display: none;    font-weight: normal;    text-align: right;    padding-right: 6px;    line-height: 22px;}.viz-controls-datapicker-shelf-token {    cursor: move;    width: 100%;    padding: 0px 0px 0px 3px;    display: block;    position: relative;    color: #FFFFFF;    background-color: #666666;    background: #666666;    border: 1px solid #333;    border-radius: 3px;    font-weight: bold;    overflow: hidden;    margin-bottom: 4px;}.viz-controls-datapicker-geo-icon-16 {    background-image: url('../common/assets/UVB_SharedSprite.png');    background-position: 0px -101px;}"
  };
  var vizExtBundle = sap.bi.framework.declareBundle({
    "id": "sap.viz.ext.stackedcolumnlinechart",
    "version": "1.0.1",
    "components": [{
      "id": "sap.viz.ext.stackedcolumnlinechart",
      "provide": "sap.viz.impls",
      "instance": vizExtImpl,
      "customProperties": {
        "name": "Stacked Column with Line Chart",
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