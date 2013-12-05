Iris(function () {
    // var input = "http://brie.cshl.edu/~olson/refData.json";
    var input = "./refData.json";
    var formatNumber = d3.format(",d");
    Iris.require(["underscore", "jquery", "js/brushchart"],
    function (_, $, BrushChart) {
        var BINS = 25;
        function log10(v) {
            return Math.log(v) / Math.log(10);
        }
        function byBin(v) {
            return Math.floor(v * 0.99 * BINS) / BINS;
        }
        function loadMethData(callback) {
            $.getJSON(input, function (data) {
                var meth = crossfilter(data);
                callback(meth);
            }).fail(function () {
                // TODO: Something more useful.
                console.log("Uhoh", arguments);
            });
        }
        loadMethData(function (cf) {
            var all   = cf.groupAll();
            var Dims = {
                wga:  { key: "WGA" },
                meth: { key: "CHG" }
            };
            function dimGroupPair(key) {
                var dim = cf.dimension(function (d) { return d[key]; });
                return {
                    dim: dim,
                    group: dim.group(byBin).reduceCount()
                };
            }
            for (var type in Dims) {
                var column = Dims[type];
                var pair = dimGroupPair(column.key);
                column.dim = pair.dim;
                column.group = pair.group;
            }

            var maxMeth = log10(Dims.wga.group.top(1)[0].value);
            var binLabels = _.pluck(Dims.wga.group.all(), "key");
            $("#status #total").text(formatNumber(cf.size()));

            function binValues(type1, type2) {
                var dim1 = Dims[type1].dim,
                    dim2 = Dims[type2].dim,
                    grp1 = Dims[type1].group,
                    grp2 = Dims[type2].group,
                    filtered = cf.dimension(function (d) {
                        return d[Dims[type2].key];
                    }),
                    measures = filtered.group(byBin).reduceCount(),
                    values = [],
                    binStart = 0;
                grp1.all().forEach(function (m, i) {
                    dim1.filter([binStart, m.key]);
                    measures.all().forEach(function (v, j) {
                        values.push([j, i, log10(v.value)]);
                    });
                    binStart = m.key;
                });
                dim1.filterAll();
                return values;
            }

            var histograms, chart;
        
            function renderCharts() {
                _.each(histograms, function (h) { h.render(); });
                var values = binValues("meth", "wga");
                $("#status #selected").text(formatNumber(all.value()));
            }
            function render(method) { d3.select(this).call(method); }

            histograms = [];
            histograms.push(makeBarChart("WGA", "Conservation"));
            histograms.push(makeBarChart("CHG"));
            histograms[0].filter(null);
            renderCharts();

            window.filter = function (filters) {
                console.log("Filter event", filters);
                filters.forEach(function (d, i) { histograms[i].filter(d); });
                renderCharts();
            };

            window.reset = function (i) {
                histograms[i].filter(null);
                renderCharts();
            };
            
            function makeBarChart(type, title) {
                if (this.counter === undefined) {
                    this.counter = 0;
                }
                this.counter++;
                var id = "chart-" + this.counter;
                title = (title || type);
                $("#histograms").append($("<div>", {
                    class: "chart", id: id
                }).append($("<div>", { class: "title" }).text(title)));
                var pair = dimGroupPair(type);
                return new BrushChart({
                    element: "#" + id,
                    dimension: pair.dim,
                    group: pair.group
                });
            }
        });
    });
});
