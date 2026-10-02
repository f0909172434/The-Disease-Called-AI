
// ---------- chibi reference data ----------
// Control points MEASURED from docs/reference/ai_character_reference.webp (colour-segmented silhouettes, simplified;
// hand-placed landmarks), in u: x right from the centre line, y up negative, soles at 0, crown at -10. Painted with p5.brush only.
const AI_RC = {"frill":[[0.37,-10.93],[0.8,-10.84],[0.89,-10.75],[0.85,-10.65],[0.88,-10.61],[1.08,-10.6],[1.3,-10.5],[1.39,-10.64],[1.8,-10.55],[2.11,-10.29],[2.14,-10.2],[2.04,-10.1],[2.13,-9.99],[2.27,-9.92],[2.34,-10.04],[2.41,-10.04],[2.64,-9.9],[2.9,-9.5],[2.92,-9.41],[2.79,-9.31],[2.83,-9.18],[2.9,-9.11],[3.07,-9.15],[3.25,-8.85],[3.3,-8.46],[3.16,-8.34],[3.18,-8.19],[2.88,-8.19],[2.84,-8.33],[2.88,-8.36],[2.79,-8.42],[2.73,-8.6],[2.47,-9.03],[1.92,-9.62],[1.48,-9.91],[1.26,-10],[1.22,-10.09],[1.21,-10.04],[1.16,-10.04],[1.1,-10.06],[1.1,-10.13],[1.02,-10.09],[0.73,-10.17],[0.82,-10.37],[0.79,-10.41],[0.68,-10.18],[0.1,-10.23],[0.06,-10.29],[0.05,-10.23],[-0.55,-10.18],[-1.26,-9.96],[-2.09,-9.41],[-2.5,-8.98],[-2.78,-8.57],[-2.85,-8.59],[-2.79,-8.54],[-2.84,-8.46],[-2.9,-8.46],[-2.87,-8.42],[-3.02,-8.2],[-3.21,-8.19],[-3.12,-8.5],[-3.03,-8.5],[-2.97,-8.61],[-2.97,-8.66],[-3.04,-8.7],[-2.98,-8.98],[-2.8,-9.15],[-2.74,-9.36],[-2.61,-9.52],[-2.5,-9.55],[-2.42,-9.44],[-2.39,-9.46],[-2.43,-9.5],[-2.32,-9.63],[-2.33,-9.8],[-2.05,-10.1],[-1.77,-10.24],[-1.66,-10.15],[-1.46,-10.28],[-1.49,-10.38],[-1.41,-10.47],[-0.93,-10.7],[-0.71,-10.7],[-0.66,-10.6],[-0.56,-10.64],[-0.54,-10.39],[-0.47,-10.37],[-0.39,-10.48],[-0.34,-10.69],[-0.06,-10.69],[-0.09,-10.62],[-0.05,-10.59],[0.03,-10.84]],"apron":[[-1.13,-3.21],[-1.04,-3.2],[-1.1,-2.96],[-0.96,-3.16],[-0.89,-3.17],[-0.64,-2.93],[-0.61,-2.96],[-0.76,-3.13],[0.73,-3.12],[0.62,-2.98],[0.66,-2.96],[0.84,-3.15],[0.92,-3.17],[1.07,-3.08],[1.13,-2.97],[1.18,-3.16],[1.34,-3.06],[1.39,-2.92],[1.48,-2.89],[1.52,-2.79],[1.48,-2.6],[1.57,-2.48],[1.52,-2.23],[1.46,-2.28],[1.4,-2.27],[1.44,-2.24],[1.36,-2.05],[1.41,-1.99],[1.39,-1.91],[1.25,-1.75],[1.21,-1.73],[1.18,-1.8],[1.13,-1.77],[1.04,-1.68],[1.06,-1.63],[0.93,-1.52],[0.76,-1.46],[0.75,-1.53],[0.69,-1.53],[0.33,-1.32],[0.15,-1.32],[0.11,-1.39],[0,-1.4],[-0.14,-1.4],[-0.14,-1.32],[-0.25,-1.32],[-0.55,-1.48],[-0.59,-1.41],[-0.83,-1.5],[-0.92,-1.66],[-0.99,-1.69],[-1.06,-1.66],[-1.24,-1.8],[-1.29,-1.87],[-1.26,-1.97],[-1.36,-1.99],[-1.43,-2.09],[-1.39,-2.19],[-1.46,-2.24],[-1.52,-2.41],[-1.49,-2.55],[-1.41,-2.6],[-1.4,-2.74],[-1.45,-2.75],[-1.41,-2.92],[-1.27,-2.98],[-1.27,-3.06]],"petti":[[-2.74,-1.75],[-2.42,-1.75],[-2.22,-1.55],[-2.25,-1.45],[-2.1,-1.31],[-1.9,-1.18],[-1.83,-1.26],[-1.46,-1.04],[-1.24,-0.98],[-1.21,-0.93],[-1.13,-0.96],[-0.76,-0.85],[-0.19,-0.79],[0.36,-0.8],[0.37,-0.76],[0.42,-0.82],[0.82,-0.83],[0.85,-0.75],[0.89,-0.85],[1.27,-0.92],[1.34,-0.84],[1.36,-0.96],[1.58,-1.01],[1.76,-1.11],[1.86,-1.04],[2.1,-1.16],[2.24,-1.27],[2.2,-1.38],[2.29,-1.41],[2.33,-1.31],[2.36,-1.45],[2.61,-1.62],[2.68,-1.54],[2.66,-1.66],[2.75,-1.75],[3.11,-1.73],[3.03,-1.67],[2.97,-1.52],[2.87,-1.43],[2.8,-1.43],[2.75,-1.32],[2.61,-1.2],[2.47,-1.12],[2.38,-1.12],[2.27,-0.98],[2.08,-0.88],[1.9,-0.87],[1.82,-0.79],[1.59,-0.7],[1.38,-0.7],[1.24,-0.62],[1.02,-0.59],[-0.69,-0.59],[-0.8,-0.64],[-1.15,-0.66],[-1.57,-0.85],[-1.72,-0.85],[-1.92,-0.97],[-1.96,-1.04],[-2.14,-1.08],[-2.33,-1.24],[-2.39,-1.35],[-2.59,-1.49],[-2.64,-1.64]],"bib":[[0.66,-4.27],[0.78,-3.87],[0.78,-3.68],[0.71,-3.54],[0.56,-3.52],[0.54,-3.62],[0.5,-3.5],[0.23,-3.5],[0.19,-3.57],[0.19,-3.5],[0.13,-3.49],[0.06,-3.53],[0.08,-3.62],[0.05,-3.64],[0.03,-3.49],[-0.11,-3.49],[-0.17,-3.55],[-0.2,-3.49],[-0.27,-3.49],[-0.31,-3.58],[-0.33,-3.5],[-0.62,-3.5],[-0.75,-3.54],[-0.8,-3.62],[-0.82,-3.86],[-0.73,-4.01],[-0.75,-4.04],[-0.66,-4.25],[-0.5,-4.14],[-0.51,-4.1],[-0.57,-4.09],[-0.54,-4.06],[-0.57,-3.99],[-0.33,-3.85],[-0.27,-3.85],[-0.19,-3.96],[-0.17,-3.94],[-0.14,-3.97],[-0.18,-4],[-0.1,-4.04],[-0.11,-4.1],[0,-4.17],[0.06,-4.09],[0.01,-4.03],[0.04,-4],[0.09,-4.03],[0.17,-3.86],[0.22,-3.83],[0.51,-4],[0.47,-4.08],[0.54,-4.11],[0.51,-4.14],[0.43,-4.11],[0.41,-4.15],[0.48,-4.14],[0.55,-4.24]],"bow":[[2.83,-8.22],[2.94,-7.96],[3.06,-7.96],[3.25,-7.89],[3.29,-7.91],[3.31,-8.08],[3.29,-8.17],[3.2,-8.22],[3.57,-8.22],[3.64,-8.04],[3.8,-8.11],[3.92,-8.1],[4.03,-7.83],[4.05,-7.38],[4,-7.29],[3.91,-7.25],[4.08,-7.08],[3.34,-7.08],[3.29,-7.16],[3.24,-7.08],[2.96,-7.08],[2.96,-7.31],[2.92,-7.35],[2.9,-7.48],[2.87,-7.5],[2.84,-7.46],[2.79,-7.52],[2.79,-7.59],[2.85,-7.68],[2.82,-7.81],[2.76,-7.85],[2.79,-7.89],[2.76,-7.91],[2.76,-8.08],[2.84,-7.92],[2.89,-7.97]],"bowtie":[[0.46,-4.7],[0.55,-4.68],[0.69,-4.7],[0.69,-4.66],[0.6,-4.65],[0.56,-4.61],[0.57,-4.46],[0.51,-4.19],[0.39,-4.14],[0.48,-4.03],[0.48,-3.99],[0.13,-3.97],[0,-4.27],[-0.09,-4.24],[-0.15,-4.09],[-0.11,-4.04],[-0.17,-4.05],[-0.2,-3.97],[-0.55,-3.99],[-0.47,-4.13],[-0.54,-4.17],[-0.57,-4.23],[-0.6,-4.56],[-0.62,-4.59],[-0.68,-4.59],[-0.7,-4.56],[-0.7,-4.64],[-0.6,-4.62],[-0.45,-4.68],[-0.2,-4.61],[0.13,-4.61],[0.24,-4.66]],"shoeL":[[-1.4,-0.73],[-1.29,-0.73],[-1.17,-0.65],[-0.99,-0.61],[-0.82,-0.62],[-0.71,-0.57],[-0.55,-0.55],[-0.23,-0.56],[-0.18,-0.52],[-0.01,-0.51],[-0.01,-0.48],[-0.13,-0.48],[-0.27,-0.54],[-0.31,-0.5],[-0.31,-0.22],[-0.41,-0.09],[-0.48,-0.05],[-0.92,-0.04],[-1.1,-0.1],[-1.3,-0.29],[-1.4,-0.54]],"shoeR":[[1.69,-0.73],[1.8,-0.73],[1.63,-0.65],[1.55,-0.38],[1.41,-0.18],[1.24,-0.06],[1.06,-0.01],[0.79,-0.01],[0.6,-0.08],[0.5,-0.22],[0.5,-0.47],[0.38,-0.51],[0.38,-0.56],[0.43,-0.52],[0.71,-0.52],[0.87,-0.59],[1.17,-0.59],[1.36,-0.68],[1.48,-0.66]],"handL":[[-1.43,-3.85],[-1.27,-3.85],[-1.17,-3.8],[-1.07,-3.64],[-1.06,-3.55],[-1.11,-3.4],[-1.18,-3.32],[-1.2,-3.34],[-1.26,-3.26],[-1.29,-3.29],[-1.5,-3.29],[-1.53,-3.26],[-1.53,-3.29],[-1.63,-3.38],[-1.66,-3.48],[-1.64,-3.63],[-1.58,-3.76]],"handR":[[1.21,-3.9],[1.34,-3.9],[1.48,-3.85],[1.59,-3.67],[1.61,-3.57],[1.58,-3.44],[1.53,-3.38],[1.4,-3.31],[1.26,-3.31],[1.2,-3.34],[1.18,-3.32],[1.08,-3.39],[1.08,-3.83]],"whale":[[0.38,-2.32],[0.47,-2.32],[0.57,-2.28],[0.71,-2.13],[0.75,-2.11],[0.8,-2.11],[0.85,-2.18],[0.85,-2.22],[0.79,-2.28],[0.8,-2.32],[0.88,-2.28],[0.96,-2.32],[0.96,-2.27],[0.88,-2.2],[0.84,-2.08],[0.76,-2],[0.65,-2],[0.62,-1.97],[0.66,-1.95],[0.61,-1.95],[0.42,-2.05],[0.22,-2.06],[0.25,-2.23]],"ahoge":[[-1.26,-11.52],[-1.02,-11.52],[-0.79,-11.46],[-0.6,-11.36],[-0.47,-11.24],[-0.36,-10.99],[-0.34,-10.79],[-0.32,-10.76],[-0.2,-10.76],[-0.2,-10.73],[-0.29,-10.73],[-0.36,-10.69],[-0.43,-10.45],[-0.51,-10.45],[-0.51,-10.57],[-0.55,-10.65],[-0.66,-10.62],[-0.73,-10.73],[-0.89,-10.73],[-1.08,-10.68],[-1.32,-10.56],[-1.46,-10.45],[-1.52,-10.45],[-1.3,-10.62],[-0.98,-10.75],[-0.71,-10.76],[-0.61,-10.68],[-0.57,-10.71],[-0.62,-10.83],[-0.85,-11.03],[-1.03,-11.11],[-1.27,-11.15],[-1.54,-11.13],[-1.9,-11.03],[-2.23,-10.83],[-2.37,-10.69],[-2.43,-10.57],[-2.5,-10.55],[-2.48,-10.66],[-2.38,-10.85],[-2.08,-11.17],[-1.66,-11.41]],"tail":[[6.1,-4.04],[6.2,-4.04],[6.25,-3.97],[6.25,-3.64],[6.08,-3.11],[5.67,-2.66],[5.18,-2.36],[5.08,-1.78],[4.61,-1.25],[4.31,-1.06],[3.82,-0.9],[2.93,-0.96],[2.56,-0.68],[2.2,-0.83],[2.46,-1.07],[2.57,-1.01],[2.64,-1.07],[2.6,-1.12],[3.02,-1.46],[3.13,-1.71],[3.25,-1.41],[3.49,-1.25],[3.58,-1.24],[3.64,-1.3],[3.57,-1.4],[3.59,-1.45],[3.83,-1.32],[4.19,-1.39],[4.31,-1.5],[4.24,-1.57],[4.13,-1.54],[3.96,-1.62],[3.96,-1.87],[4.38,-1.9],[4.65,-2.08],[4.78,-2.33],[4.6,-2.51],[4.5,-2.52],[4.48,-2.59],[4.8,-2.8],[4.92,-3.02],[4.9,-3.13],[4.98,-3.11],[5.04,-3.17],[5.13,-3.4],[5.31,-3.58],[5.86,-3.85]],"skirt":[[-1.18,-3.17],[-1.69,-3.02],[-2.13,-2.76],[-2.45,-2.45],[-2.65,-2.06],[-2.75,-1.64],[-2.66,-1.34],[-2.31,-1.13],[-1.21,-0.96],[0,-0.89],[1.21,-0.94],[2.33,-1.11],[2.7,-1.34],[2.82,-1.72],[2.71,-2.15],[2.48,-2.56],[2.1,-2.89],[1.72,-3.07],[1.24,-3.17]],"sleeveL":[[-1.15,-4.39],[-1.59,-4.32],[-2,-4.14],[-2.23,-3.85],[-2.31,-3.46],[-2.2,-3.12],[-1.97,-2.89],[-1.62,-2.92],[-1.34,-3.17],[-1.15,-3.53]],"sleeveR":[[1.17,-4.39],[1.62,-4.32],[2.04,-4.14],[2.28,-3.85],[2.36,-3.46],[2.25,-3.12],[2,-2.89],[1.66,-2.92],[1.38,-3.17],[1.21,-3.53]],"bodice":[[-0.89,-4.65],[-1.21,-4.36],[-1.24,-3.53],[-1.15,-3.1],[1.21,-3.1],[1.26,-3.53],[1.26,-4.36],[0.93,-4.65]],"corset":[[-1.17,-3.5],[1.24,-3.5],[1.24,-3.1],[-1.17,-3.1]],"collarL":[[-0.61,-4.65],[-0.83,-4.73],[-1.13,-4.64],[-1.24,-4.36],[-0.98,-4.19],[-0.68,-4.34]],"collarR":[[0.64,-4.65],[0.85,-4.73],[1.16,-4.64],[1.26,-4.36],[1.01,-4.19],[0.7,-4.34]],"neck":[[-0.32,-4.7],[0.32,-4.7],[0.37,-4.47],[-0.37,-4.47]],"sockL":[[-1.13,-0.75],[-0.29,-0.75],[-0.32,-0.42],[-1.08,-0.42]],"sockR":[[0.37,-0.73],[1.26,-0.73],[1.24,-0.39],[0.42,-0.39]],"finL":[[-4.55,-5.69],[-4.29,-5.87],[-4.01,-6.06],[-3.71,-6.28],[-3.4,-6.51],[-3.12,-6.66],[-2.92,-6.69],[-2.54,-5.69],[-2.48,-5.35],[-2.71,-5.36],[-2.97,-5.44],[-3.25,-5.48],[-3.53,-5.5],[-3.81,-5.48],[-4.09,-5.52],[-4.32,-5.58]],"finR":[[3.02,-7.2],[3.38,-7.1],[3.76,-6.94],[4.17,-6.71],[4.55,-6.46],[4.88,-6.23],[5.16,-6.05],[4.96,-6],[4.68,-5.99],[4.39,-6],[4.11,-6.04],[3.83,-6.1],[3.53,-6.19],[3.22,-6.33],[2.99,-6.48]],"mouth":[[-0.37,-5.31],[-0.19,-5.27],[0,-5.26],[0.19,-5.29],[0.38,-5.34],[0.33,-5.16],[0.19,-4.93],[0,-4.83],[-0.2,-4.92],[-0.33,-5.12]],"tongue":[[-0.19,-4.98],[-0.04,-5.06],[0.17,-5.03],[0.14,-4.89],[0,-4.84],[-0.15,-4.89]],"lines":{"band":[[[-3.27,-7.86],[-3.12,-8.43],[-2.8,-9.01],[-2.29,-9.49],[-1.66,-9.83],[-0.83,-10.06],[0.06,-10.17],[0.96,-10.13],[1.72,-9.92],[2.29,-9.58],[2.68,-9.07],[2.89,-8.5],[2.97,-8.05]]],"hem":[[[-2.66,-1.39],[-1.97,-1.11],[-1.21,-0.96],[0,-0.89],[1.21,-0.94],[2.04,-1.11],[2.71,-1.39]]],"apronEdge":[[[-1.21,-3.07],[-1.62,-2.76],[-1.77,-2.25],[-1.57,-1.8],[-1.08,-1.49],[0,-1.34],[1.08,-1.49],[1.59,-1.8],[1.8,-2.25],[1.64,-2.76],[1.24,-3.07]]],"skirtL":[[[-2,-2.89],[-2.03,-1.43]]],"skirtR":[[[2,-2.89],[2.05,-1.43]]],"embL":[[[-2.33,-2.48],[-2.2,-2],[-1.9,-1.49],[-1.34,-1.16],[-0.8,-1.06]]],"embR":[[[2.38,-2.48],[2.27,-2],[2,-1.49],[1.4,-1.16],[0.87,-1.06]]]},"p":{"neck":[0,-4.599],"cuffL":[-1.643,-3.529,0.42,0.433],"cuffR":[1.567,-3.567,0.42,0.433],"puffL":[-1.745,-3.962,0.51,0.382],"puffR":[1.771,-3.987,0.51,0.382],"bowC":[3.325,-7.656,0.637],"finAxL":[[-4.522,-5.72],[-2.484,-5.592]],"finAxR":[[2.994,-6.586],[5.134,-6.115]],"btns":[[0,-3.987],[0,-3.771],[0,-3.567]],"gold":[[-0.42,-3.376],[0.318,-3.376],[-0.42,-3.185],[0.318,-3.185]],"gem":[0,-4.446,0.14],"gbowL":[-1.911,-1.847,0.306],"gbowR":[1.975,-1.796,0.306],"sprigs":[[-2.28,-2.382],[-1.21,-1.338],[2.102,-2.344],[2.611,-2.102],[1.592,-1.299],[-1.822,-1.516]],"buckles":[[-1.083,-0.561],[1.338,-0.497]],"spout":[0.471,-2.459],"whaleEye":[0.293,-2.178],"finRootL":[-2.42,-6.013],"finRootR":[3.057,-6.777],"tailRoot":[2.229,-0.854],"ahogeBase":[-0.573,-10.408]}};

// ---------- full-body reference data ----------
// Silhouettes MEASURED from docs/reference/ai_character_reference_full.png (colour segmentation at 2x, simplified), in u
// (52.5 ref px = 1u; soles at y 0; x from the point between the feet). Landmarks in AI_RFP are reference pixels.
const AI_RF = {"apron":[[1.467,-6.743],[1.505,-6.705],[1.505,-6.571],[1.505,-6.486],[1.486,-6.429],[1.505,-6.4],[1.505,-6.41],[1.505,-6.524],[1.505,-5.048],[1.495,-5.324],[1.324,-5.505],[1.295,-5.438],[1.371,-5.352],[1.371,-5.257],[1.324,-5.181],[1.381,-5.114],[1.381,-5.038],[1.314,-4.895],[1.39,-4.8],[1.381,-4.714],[1.429,-4.686],[1.505,-4.505],[1.505,-4.41],[1.505,-3.705],[1.505,-3.771],[1.429,-4.486],[1.381,-4.581],[1.276,-4.448],[1.314,-4.4],[1.286,-4.276],[1.21,-4.181],[1.171,-4.2],[1.133,-4.162],[1.105,-4.048],[1.029,-3.971],[0.943,-3.99],[0.829,-3.848],[0.705,-3.81],[0.648,-3.819],[0.6,-3.886],[0.467,-3.886],[0.438,-3.848],[0.4,-3.857],[0.286,-3.933],[0.314,-3.981],[0.181,-4.105],[0.133,-4.076],[0.086,-4.086],[0.038,-4.21],[-0.01,-4.171],[-0.114,-4.267],[-0.21,-4.419],[-0.219,-4.505],[-0.181,-4.552],[-0.276,-4.657],[-0.267,-4.733],[-0.295,-4.762],[-0.314,-4.743],[-0.381,-4.848],[-0.41,-4.943],[-0.4,-5.057],[-0.343,-5.086],[-0.343,-5.162],[-0.371,-5.19],[-0.41,-5.181],[-0.419,-5.229],[-0.419,-5.4],[-0.39,-5.448],[-0.419,-5.733],[-0.371,-5.8],[-0.4,-5.848],[-0.381,-6],[-0.314,-6.086],[-0.295,-6.181],[-0.257,-6.181],[-0.21,-6.229],[-0.21,-6.324],[-0.086,-6.486],[-0.124,-6.524],[-0.095,-6.571],[-0.048,-6.581],[-0.095,-6.543],[-0.019,-6.476],[0.114,-6.533],[0.086,-6.562],[0,-6.543],[0.029,-6.648],[0.286,-6.705],[0.714,-6.686],[0.79,-6.648],[0.8,-6.524],[0.771,-6.495],[0.8,-6.467],[0.857,-6.505],[0.886,-6.495],[0.971,-6.333],[1.095,-6.295],[1.19,-6.41],[1.314,-6.457],[1.429,-6.571]],"tail":[[2.743,-5.486],[2.781,-5.448],[2.848,-5.248],[2.848,-4.762],[2.714,-4.476],[2.419,-4.133],[2.429,-3.657],[2.362,-3.457],[2.381,-3.41],[2.314,-3.371],[2.095,-3.038],[1.886,-2.848],[1.505,-2.848],[1.505,-2.924],[1.505,-3.105],[1.505,-4.21],[1.505,-4.343],[1.505,-4.448],[1.505,-4.543],[1.505,-4.619],[1.629,-3.438],[1.657,-3.41],[1.819,-3.467],[2.076,-3.686],[2.21,-3.905],[2.248,-4.038],[2.248,-4.086],[2.181,-4.162],[1.905,-4.238],[1.733,-4.333],[1.571,-4.486],[1.505,-4.724],[1.505,-4.8],[1.505,-4.876],[1.505,-4.971],[1.505,-5.029],[1.505,-5.124],[1.505,-5.181],[1.505,-5.238],[1.505,-5.362],[1.505,-5.476],[1.505,-5.324],[1.724,-4.771],[1.895,-4.638],[2.114,-4.59],[2.21,-4.533],[2.324,-4.8],[2.667,-5.2]],"handL":[[-1.21,-6.105],[-1.19,-6.105],[-1.19,-5.905],[-1.248,-5.81],[-1.476,-5.695],[-1.562,-5.619],[-1.562,-5.676],[-1.429,-5.81],[-1.448,-5.848],[-1.562,-5.857],[-1.619,-5.829],[-1.762,-5.657],[-1.81,-5.686],[-1.819,-5.79],[-1.848,-5.819],[-1.895,-5.771],[-1.943,-5.762],[-1.829,-5.867],[-1.695,-5.895],[-1.629,-5.971],[-1.4,-6.019],[-1.257,-6.067]],"handR":[[1.924,-7.952],[2.038,-7.743],[2.133,-7.886],[2.181,-7.924],[2.171,-7.876],[2.095,-7.771],[2.114,-7.752],[2.2,-7.79],[2.238,-7.79],[2.238,-7.771],[2.133,-7.733],[2.095,-7.743],[1.914,-7.552],[1.686,-7.495],[1.619,-7.429],[1.6,-7.371],[1.552,-7.381],[1.486,-7.448],[1.524,-7.476],[1.524,-7.571],[1.571,-7.667],[1.657,-7.771],[1.752,-7.829],[1.876,-7.943],[1.876,-7.895],[1.838,-7.838],[1.924,-7.724],[1.981,-7.743],[1.943,-7.876],[1.914,-7.895]],"shoeL":[[-0.676,-0.933],[-0.6,-0.933],[-0.581,-0.781],[-0.629,-0.724],[-0.629,-0.667],[-0.61,-0.648],[-0.562,-0.676],[-0.514,-0.571],[-0.419,-0.629],[-0.267,-0.6],[-0.238,-0.514],[-0.257,-0.457],[-0.238,-0.314],[-0.286,-0.257],[-0.448,-0.257],[-0.543,-0.314],[-0.6,-0.381],[-0.638,-0.486],[-0.629,-0.6],[-0.695,-0.695]],"shoeR":[[0.533,-0.648],[0.562,-0.638],[0.581,-0.486],[0.543,-0.257],[0.495,-0.21],[0.476,-0.105],[0.448,-0.067],[0.333,-0.01],[0.181,0],[0.086,-0.029],[0.038,-0.076],[0.038,-0.2],[0.114,-0.343],[0.143,-0.324],[0.19,-0.352],[0.286,-0.352],[0.343,-0.324],[0.39,-0.267],[0.429,-0.286],[0.448,-0.352],[0.486,-0.324],[0.514,-0.343],[0.533,-0.4],[0.495,-0.457],[0.524,-0.524]]};
// ai.js: "her", the AI. An original whale-maid girl, painted with p5.brush through paint()/inkLine()/glow() only.
// Global-script style (no modules); every global here is prefixed ai / AI_ so it can share the page with him.js.
//
//   ai(x, y, u, o)   (x, y) = the GROUND point between her feet. She hovers: her body floats o.float u above it and
//                    her soft shadow stays on the ground there. She is 10u tall, soles to crown, in BOTH forms (the ahoge
//                    and the headdress frill rise ~0.6u above that); the full form is ~5u wide with hair and tail.
//   o.form     'full' (~6.6 heads, chorus 1) | 'chibi' (~2.5 heads, verse 1: the tiny helper in his phone)
//   o.view     'front' | 'q' (3/4) | 'side' (full only); every view faces screen-right, o.flip mirrors it
//   o.pose     'curtsy' (full only): the reference pose: one hand lifting the skirt, the other raised by the shoulder,
//              head tilted. The chibi's and the curtsy's bodies are painted from control points MEASURED on the two reference
//              images (AI_RC, AI_RF, AI_RFP); front/q/side of the full form are the procedural model. The head (hair built
//              from locks, face, fins) is one shared design placed on each (see "the head: one design for every view").
//   o.pal      'default' | 'glow' | 'amber' (or a palette object); o.pal2 + o.palK cross-fade to a second palette
//   face       eyes, mouth (smile cat open A I U E O frown wobble flat perfect), lookX/lookY (-1..1), blink (0..1, auto
//              when undefined), lid (0..1 droop), brow (-1 raised .. 1 worried), blush 0..1, tilt (head, rad)
//   body       float (u, hover height; default .25), bob (u, default a slow sine), dy/dx (u), sq (squash), rot (lean, rad,
//              pivots at the feet), fin (-1 droop .. 1 perk), flap (fin flap, rad), ahoge (curl spring, rad), tail (sway
//              phase), tailK (sway amount), aL/aR (upper-arm angle from hanging, + = out/up), eL/eR (elbow bend, + = forearm
//              folds in; default: hands clasped at the apron), handL/handR ('relax' | 'open' | 'fist'), legL/legR (dangle,
//              rad), hairLag (tips trail, head units), headDx/headDy (u), seed (blink phase), t (time; default T)
//   fx         glitch 0..1 (slices of her slide sideways, cyan/magenta scan marks: the 503 outage), clip [x0,y0,x1,y1]
//              (world px rectangle; only what's inside is painted: panels, phone screens), boilKey, emote/emoteK/emoteAge
//   hooks      draw(u, H): paint extra things in her space after her (H maps head units to her local px)
// aiFeel(name, t, over) = one emotion alive at t; aiEmotions(t, keys, o) = acted changes; aiTalk(t, t0, t1) = visemes.
// Emotions (AI_EMO): smile gentle eager worried heart blank sad perfect. Loops: ai_sheet, ai_emotions, ai_faces, ai_cmp_*.
// Cost: ~400-750 ms per figure at u ~ 60-95 on the CPU-only box (busy); it follows p5.brush's colour changes (ai.STATUS.md).

// ---------- palettes ----------
const AI_PAL = {
  // sampled from the two reference images (k-means per region), nudged slightly brighter for the hair
  default: {
    ink: '#1E1D33', line: '#3D4061', skin: '#FEEDE4', skinSh: '#F7CFC5', cheek: '#F2ADA6',
    hair0: '#3A4880', hair1: '#5E71AA', hair2: '#6886BA', hair3: '#7AA4CE', hair4: '#9CC3E6', hairHi: '#7E9BCB', hairInk: '#1D2038',
    fin: '#3F4364', finIn: '#AEB1CE',
    iris0: '#27346A', iris1: '#4A72B8', iris2: '#86B2E6', iris3: '#C4E2FA', pupil: '#222742', white: '#FCF4F4', hi: '#FFFDFD', lash: '#1E1520',
    navy: '#3B3D5E', navySh: '#26273F', navyHi: '#55567B', gold: '#C9AB9A', panel: '#8090C0', panelSh: '#5E6C9C',
    cream: '#FDF4F3', creamSh: '#DDD2DC', bow: '#7BAAD3', bowSh: '#4F76A0', gem: '#93A6BF',
    stock: '#FDF8F7', stockSh: '#DCCFD9', shoe: '#30334F', shoeHi: '#55587A', tail: '#4A5078', tailIn: '#8FA6C8',
    mouth: '#F4A49C', tongue: '#FFCFC7', heart: '#F47D9B', teeth: '#FFFDFB',
    br: 'inkfine', brS: 'ink', J: .25, swk: 1, rim: '#7FE9FF', glowK: 0, shadow: '#2B2B45', hatch: '#16172A'
  }
};
AI_PAL.glow = { ...AI_PAL.default,
  iris1: '#4F86D8', iris2: '#7FE9FF', iris3: '#E8FDFF', hair3: '#7FB6E2', hair4: '#B4E6FA', bow: '#7FE9FF', gem: '#E8FDFF',
  line: '#2F5A9A', glowK: 1 };
AI_PAL.amber = {
  ink: '#4A2614', line: '#7A4424', skin: '#FDE6CF', skinSh: '#F2C29E', cheek: '#F59A7E',
  hair0: '#4E220E', hair1: '#7E3A16', hair2: '#B8611F', hair3: '#E89446', hair4: '#FFC98E', hairHi: '#D07A34', hairInk: '#3E1C0C',
  fin: '#6A3418', finIn: '#F6C995',
  iris0: '#5E260A', iris1: '#B85A16', iris2: '#FFB070', iris3: '#FFE6BE', pupil: '#341404', white: '#FFF8EE', hi: '#FFFBF2', lash: '#3A1A0A',
  navy: '#6E3B20', navySh: '#4C2612', navyHi: '#97592F', gold: '#FFB070', panel: '#B8784A', panelSh: '#8A5230',
  cream: '#FFF4E4', creamSh: '#EDCDA8', bow: '#FFB070', bowSh: '#D9813C', gem: '#FFD9A0',
  stock: '#FFF4E8', stockSh: '#EDCFAE', shoe: '#5A2C16', shoeHi: '#9A5C34', tail: '#7A4020', tailIn: '#F2B884',
  mouth: '#F0907A', tongue: '#FFC4A8', heart: '#FF8A6A', teeth: '#FFFBF4',
  br: 'ink', brS: 'ink', J: .9, swk: 1.3, rim: '#FFB070', glowK: 0, shadow: '#4A2614', hatch: '#3A1A08'
};
// Mix two palettes (hex colours blend, the rest switch at the halfway point): the amber swap in the last chorus.
function aiPalMix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = {};
  for (const key in a) o[key] = typeof a[key] === 'string' && a[key][0] === '#' && b[key] ? mixCol(a[key], b[key], k)
    : typeof a[key] === 'number' ? lerp(a[key], b[key] ?? a[key], k) : (k < .5 ? a[key] : b[key]);
  return o;
}

// ---------- painting helpers ----------
// AI_S is the character being painted right now (set by ai()): palette, line weights, jitter, glitch warp, clip.
let AI_S = null;
const aiInRect = (p, r) => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3];
// Sutherland-Hodgman: the part of a polygon inside an axis-aligned rectangle r = [x0, y0, x1, y1].
function aiClipPoly(P, r) {
  let out = P;
  for (const [ax, v, d] of [[0, r[0], 1], [0, r[2], -1], [1, r[1], 1], [1, r[3], -1]]) {
    const inp = out; out = []; if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length], ia = (a[ax] - v) * d >= 0, ib = (b[ax] - v) * d >= 0;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (v - a[ax]) / (b[ax] - a[ax]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
  }
  return out;
}
// The runs of a polyline that lie inside r (an outline cut by a panel edge never draws a line along the cut).
function aiClipRuns(P, r, closed) {
  const pts = closed ? P.concat([P[0]]) : P, runs = []; let cur = [];
  for (const p of pts) { if (aiInRect(p, r)) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur);
  return runs;
}
// Boil + glitch for one shape: a gentle low-frequency wobble (whole-shape, so outlines never fuzz) and the glitch's
// sideways slice offsets, both in her local (feet-origin) space.
function aiWarp(P) {
  const S = AI_S, J = S.J;
  const ox = jit(J), oy = jit(J), ph = random() * TAU, f = .21 + random() * .1;
  return P.map((p, i) => {
    let x = p[0] + ox + J * .6 * Math.sin(i * f + ph), y = p[1] + oy + J * .6 * Math.cos(i * f * 1.3 + ph);
    if (S.warp) x += S.warp(y);
    if (S.rot) { const c = Math.cos(S.rot), n = Math.sin(S.rot); return [x * c - y * n, x * n + y * c]; }
    return [x, y];
  });
}
// glow() at a point of her local space (follows her lean).
function aiGlow(x, y, r, col, a) { const S = AI_S; if (S.rot) { const c = Math.cos(S.rot), n = Math.sin(S.rot); [x, y] = [x * c - y * n, x * n + y * c]; } glow(x, y, r, col, a); }
// One painted shape: o = { wash, op (wash opacity), ink (null = none), sw (absolute), br, hatch }.
function aiPaint(pts, o = {}) {
  const S = AI_S; if (pts.length < 3) return;
  const Q = aiWarp(pts), ink = o.ink === null ? null : (o.ink || S.P.ink), sw = o.sw ?? S.sw, br = o.br || S.br;
  if (S.clip && !Q.every(p => aiInRect(p, S.clip))) {
    if (o.wash) { const C = aiClipPoly(Q, S.clip); if (C.length > 2) paint(C, { wash: o.wash, washOp: o.op ?? 255, ink: null }); }
    if (ink) for (const run of aiClipRuns(Q, S.clip, true)) inkLine(run, sw, ink, br, 0);
    return;
  }
  paint(Q, { wash: o.wash, washOp: o.op ?? 255, ink, sw, br, curv: 0, hatch: o.hatch });
}
function aiLine(pts, sw, col, br) {
  const S = AI_S; if (pts.length < 2 || sw <= 0) return;
  const Q = aiWarp(pts); col = col || S.P.ink; br = br || S.br;
  if (S.clip && !Q.every(p => aiInRect(p, S.clip))) { for (const run of aiClipRuns(Q, S.clip, false)) inkLine(run, sw, col, br, 0); return; }
  inkLine(Q, sw, col, br, .5);
}
// Closed Catmull-Rom loop through control points; a point with a third element (truthy) is a sharp corner.
function aiLoop(P, n = 5) {
  const m = P.length, out = [];
  for (let i = 0; i < m; i++) {
    const p1 = P[i], p2 = P[(i + 1) % m], p0 = p1[2] ? p1 : P[(i - 1 + m) % m], p3 = p2[2] ? p2 : P[(i + 2) % m];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  return out;
}
// Open curve through points; sharp corners as in aiLoop.
function aiCurve(P, n = 5) {
  if (P.length < 3) return P.map(p => [p[0], p[1]]);
  const m = P.length, out = [];
  for (let i = 0; i < m - 1; i++) {
    const p1 = P[i], p2 = P[i + 1], p0 = p1[2] || i === 0 ? p1 : P[i - 1], p3 = p2[2] || i + 2 >= m ? p2 : P[i + 2];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  out.push([P[m - 1][0], P[m - 1][1]]);
  return out;
}
// Ellipse points.
function aiEll(cx, cy, rx, ry, n = 20, rot = 0) {
  const p = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return p;
}
// Ribbon edges along a centreline with a width per control point (smoothly interpolated): { L, R, C }.
function aiRib(P, Wd, n = 5) {
  const C = aiCurve(P, n), m = C.length, L = [], R = [];
  for (let i = 0; i < m; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const f = i / Math.max(1, m - 1) * (Wd.length - 1), j = Math.min(Wd.length - 2, Math.floor(f)), w = lerp(Wd[j], Wd[j + 1], ease(f - j)) / 2;
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  return { L, R, C };
}
// Closed outline of the ribbon from fraction a to b along it; skew slants the cut at a (R side starts later).
function aiRibPts(E, a = 0, b = 1, skew = 0) {
  const m = E.L.length - 1, ia = clamp(Math.round(a * m), 0, m), ib = clamp(Math.round(b * m), 0, m), ja = clamp(Math.round((a + skew) * m), 0, ib);
  return E.L.slice(ia, ib + 1).concat(E.R.slice(ja, ib + 1).reverse());
}
// Heart outline, about 2r wide.
function aiHeartPts(cx, cy, r, n = 22) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + 16 * Math.pow(Math.sin(a), 3) * r / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16]); }
  return p;
}
// Light pencil hatching for a shadow shape (scaled to her size): pass as aiPaint's hatch option.
const aiHatch = (col, ang = .9, k = 1) => ({ d: Math.max(2.6, AI_S.u * .058) * k, a: ang, o: { rand: .2 }, b: 'HB', c: col || AI_S.P.hatch, w: clamp(AI_S.u / 120, .35, .9) });
// Rotate a point around a pivot.
const aiRot = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * k - dy * s, c[1] + dx * s + dy * k]; };
// The part of a polygon to the left of the directed line a→b (Sutherland-Hodgman against one half-plane).
function aiClipHalf(P, a, b) {
  const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const k = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
  }
  return out;
}
// Splice holes into a closed outline through zero-width slits (opposite winding), so one wash leaves them empty.
function aiSplice(outer, holes) {
  const area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
  let out = outer.slice(); const so = Math.sign(area(outer));
  for (let h of holes) {
    if (Math.sign(area(h)) === so) h = h.slice().reverse();
    let bi = 0, bj = 0, bd = Infinity;
    for (let i = 0; i < out.length; i++) for (let j = 0; j < h.length; j++) { const d = Math.hypot(out[i][0] - h[j][0], out[i][1] - h[j][1]); if (d < bd) { bd = d; bi = i; bj = j; } }
    out = out.slice(0, bi + 1).concat(h.slice(bj), h.slice(0, bj + 1), out.slice(bi));
  }
  return out;
}
// Clip a closed outline (u space) to y > yc with a wavy, lock-like cut: pointed tongues reaching up (dip-dyed hair).
function aiClipWave(P, yc, amp, n, ph = 0) {
  const C = aiClipPoly(P, [-1e4, yc, 1e4, 1e4]), out = [];
  for (let i = 0; i < C.length; i++) {
    const a = C[i], b = C[(i + 1) % C.length]; out.push(a);
    if (Math.abs(a[1] - yc) < 1e-6 && Math.abs(b[1] - yc) < 1e-6) {
      const L = Math.abs(b[0] - a[0]), m = Math.max(2, Math.round(L * n));
      for (let k = 1; k < m; k++) { const x = lerp(a[0], b[0], k / m), w = Math.pow(Math.abs(Math.sin(x * 2.6 + ph)), 3); out.push([x, yc - amp * w + amp * .15 * Math.sin(x * 7.1 + ph)]); }
    }
  }
  return out;
}

// ---------- the head: one design for every view ----------
// Head units: the cranium is a unit sphere at the head centre; x right, y down, z toward the viewer. A view turns the
// head by a yaw (AI_YAW) and the locks, the features and the fins are placed by turning their 3D points (hd.pj), so the
// chibi, the full form and the curtsy pose paint one design from any side.
const AI_YAW = { front: 0, q: .42, side: Math.PI / 2 };
// Face metrics (head units, front view). fw is the face's cross-section down its length: [y, half-width, forward shift].
// Turned by the yaw it gives the cheek and jaw contour: the jaw swings toward the far side and the cranium stays round.
const AI_FACE = {
  chibi: { eyeX: .49, eyeY: .45, ehw: .245, ehh: .222, mouthY: .79, mz: .39, noseX: -.06, noseY: .61, blushX: .54, blushY: .76, blushR: .125, chin: 1.02, finY: .36, finL: .84,
    fw: [[-.62, .86, 0], [-.2, .955, 0], [.3, .975, 0], [.58, .93, .08], [.76, .83, .2], [.88, .66, .38], [.97, .38, .58], [1.02, 0, .7]] },
  full:  { eyeX: .385, eyeY: .43, ehw: .19, ehh: .18, mouthY: .87, mz: .34, noseX: -.03, noseY: .66, blushX: .5, blushY: .73, blushR: .11, chin: 1.12, finY: .3, finL: .78,
    fw: [[-.62, .86, 0], [-.2, .94, 0], [.3, .94, 0], [.58, .85, .1], [.8, .67, .3], [.96, .44, .5], [1.07, .21, .68], [1.13, 0, .78]] },
};
// The profile contour (view 'side', facing screen-right; the forehead is under the bangs). A third element marks a corner.
const AI_PROFILE = [[-.2, -.3], [.55, -.62], [.82, -.3], [.88, .0], [.88, .22], [.85, .36], [.9, .46], [.99, .58, 1], [.92, .63], [.93, .7], [.9, .75], [.92, .8], [.87, .87], [.84, .95], [.76, 1.04], [.55, 1.07], [.3, 1.0], [.08, .8], [-.1, .45]];
// Hair per form (head units). R: the hanging hair's half-width by depth (it hugs the skull above the ears and flares
// below); Rs: the same for the face-framing locks; len / side: back and side lock lengths; grad: the depths over which
// the navy turns light blue; wl: wave length; amp: wave size; wb / ws: back / side lock widths; nb: back locks per side;
// curl: how far the tips hook outward; zk / zb: how flat the mass is front to back and how far behind the neck it hangs;
// gradS: the side locks' gradient; wp: how late down a lock its waves grow; crown: the skull hair's [width, height]; phj: [step, random] of the
// wave phase from lock to lock (small: the mass waves together). Per figure (aiHD's hf): sweepL / sweepR, the
// sideways drift of the tips on each side (a pose or the wind), and lenL / lenR, each side's length.
const AI_HAIR = {
  chibi: { R: [[0, 1.06], [.45, 1.12], [.9, 1.3], [1.4, 1.48], [1.85, 1.5], [2.3, 1.3]], Rs: [[-.5, 1.04], [.3, 1.0], [.8, .97], [1.3, 1.06], [2, 1.16]],
    len: 2.4, side: 1.55, grad: [.5, 2.1], gradS: [.35, 1.7], wl: 1.05, amp: .24, wb: .42, ws: .3, nb: 8, curl: .26, zk: .62, zb: .3, wp: .8, crown: [1.24, 1.17], phj: [2.4, 2.2] },
  full:  { R: [[0, 1.08], [.8, 1.34], [1.8, 1.8], [3, 2.12], [4.4, 2.26], [6, 2.0]], Rs: [[-.5, 1.04], [.3, 1.0], [.9, 1.02], [1.6, 1.22], [3, 1.48]],
    len: 6.1, side: 2.8, grad: [.55, 3.7], gradS: [.45, 2.7], wl: 2.3, amp: .34, wb: .6, ws: .34, nb: 8, curl: .36, zk: .55, zb: .35, wp: 1.0, crown: [1.17, 1.13], phj: [1.1, 1.1] },
};
// The bangs, painted in this order: [root x, root y, tip x, tip y, width, bow (outward arc), S-curve], front-view head
// units. Six wide, soft locks fan out from a part left of centre (x -.2): a big side-swept lock each way (their inner
// edges frame the forehead), one more each side inside it, a lock right of the part, and the one falling between the
// eyes. AI_STRANDS: the long thin strand between the eyes. Only the free lower ends are inked, so the fringe reads as a
// few soft masses.
const AI_BANGS = [
  [-.27, -1.08, -1.08, .26, .86, .2, .03], [-.1, -1.1, 1.06, .16, .9, .2, -.04],
  [-.3, -1.06, -.58, .24, .78, .04, -.02], [-.04, -1.1, .6, .2, .8, .06, .03],
  [-.1, -1.1, .2, .36, .7, -.03, -.03], [-.22, -1.09, -.12, .5, .66, -.08, .03],
];
const AI_STRANDS = [[-.2, -.85, -.17, .56, .05, .02, .05]];
// The shine band: a ring around the crown at y = AI_SHINE[0] + AI_SHINE[1] x² (it arcs down at the sides with the head),
// a glossy segment on each bang it crosses.
const AI_SHINE = [-.62, .55];
// How much of the head's tilt a point of hanging hair keeps at depth b (long hair hangs, it doesn't swing with the head).
const aiHangW = b => 1 - .75 * clamp((b - .6) / 2.2);

// The head descriptor shared by the passes. H(a, b): head units -> her local px; Hh: the same for hanging hair.
function aiHD(H, Hh, form, view, A, k, hf = {}) {
  const yaw = AI_YAW[view] ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
  const HF = { ...AI_HAIR[form], ...hf }; HF.lenL = HF.lenL ?? HF.len; HF.lenR = HF.lenR ?? HF.len;
  return { H, Hh: Hh || H, form, view, A, k, yaw, c, s, F: AI_FACE[form], HF, sway: A.sway,
    pj: (x, y, z) => [x * c + z * s, y], dp: (x, z) => -x * s + z * c };
}
// Hair colour at depth y: navy at the crown, through the mid blues to the light-blue tips (the dip-dye).
function aiHairAt(HF, y) {
  const P = AI_S.P, g = clamp((y - HF.grad[0]) / (HF.grad[1] - HF.grad[0]));
  const st = [[0, P.hair1], [.38, P.hair2], [.72, P.hair3], [1, P.hair4]];
  for (let i = 1; i < st.length; i++) if (g <= st[i][0]) return mixCol(st[i - 1][1], st[i][1], (g - st[i - 1][0]) / (st[i][0] - st[i - 1][0]));
  return P.hair4;
}

// The part of lock E from fraction a to the tip, starting in a pointed tongue (b, seed vary its length and side).
function aiTongue(E, a, b, seed) {
  const m = E.L.length - 1, ic = Math.round(a * m), ie = Math.min(m - 1, ic + Math.max(2, Math.round(m * (.09 + .07 * hash(b * 3.7 + seed))))), f = hash(b * 1.3 + seed * 2.1) < .5 ? .3 : .7;
  return [[lerp(E.L[ic][0], E.R[ic][0], f), lerp(E.L[ic][1], E.R[ic][1], f)]].concat(E.L.slice(ie), E.R.slice(ie).reverse());
}
// The part of lock E from the root to fraction to, ending in a pointed tongue down the lock.
function aiRootTongue(E, to, seed) {
  const m = E.L.length - 1, ib = Math.round(to * m), ie = Math.min(m, ib + Math.max(2, Math.round(m * .14))), f = hash(seed * 1.9 + 4) < .5 ? .35 : .65;
  return E.L.slice(0, ib + 1).concat([[lerp(E.L[ie][0], E.R[ie][0], f), lerp(E.L[ie][1], E.R[ie][1], f)]], E.R.slice(0, ib + 1).reverse());
}
// One lock: a tapered, pointed ribbon along centreline C (px) with widths Wd (px). washes = [[from, colour, opacity],
// ...] laid root to tip, each later one starting in a pointed tongue up the lock (no seam in the gradient). Ink runs down
// both sides from o.inkFrom (o.inkFromR for the right side) to the tip, never across the root, so the lock grows out of
// the hair above it; o.wL / o.wR thicken one side's line; o.mid(E) paints between the washes and the ink. Returns the
// ribbon's edges ({ L, R, C }).
function aiLock(C, Wd, washes, o = {}) {
  const S = AI_S, P = S.P, E = aiRib(C, Wd, o.n ?? 4), m = E.L.length - 1, seed = o.seed || 0;
  for (let b = 0; b < washes.length; b++) {
    const [a, col, op] = washes[b];
    if (a <= 0) { aiPaint(aiRibPts(E), { wash: col, op: op ?? 255, ink: null }); continue; }
    if (a > .93) continue;
    aiPaint(aiTongue(E, a, b, seed), { wash: col, op: op ?? 255, ink: null });
  }
  if (o.mid) o.mid(E);   // anything painted on the lock under its lines (a shine)
  if (o.ink !== null) {
    const col = o.ink || P.hairInk, sw = o.sw ?? S.sw * .5, br = o.br || P.br;
    aiLine(E.L.slice(Math.round(m * (o.inkFrom ?? .2))), sw * (o.wL || 1), col, br);
    aiLine(E.R.slice(Math.round(m * (o.inkFromR ?? o.inkFrom ?? .2))), sw * (o.wR || 1), col, br);
  }
  return E;
}

// A hanging lock at azimuth phi (0 = front, π/2 = her side, π = the back) on side s, from the skull at depth y0 to the
// tip at y1, as 3D points: it follows the hair's width profile (times its spread sp), waves in and out (and a little
// sideways) along its length, and the tip hooks outward and up.
function aiHang(hd, L) {
  const HF = hd.HF, n = Math.max(6, Math.round((L.y1 - L.y0) / HF.wl * 4.5)), pts = [], T = L.side ? HF.Rs : HF.R;
  const cp = Math.cos(L.phi), sp = Math.sin(L.phi), back = !L.side, zk = back && cp < 0 ? HF.zk : 1;
  const radial = (r, y, tw) => {
    const x = L.s * (r * sp + tw * cp), z = (r * cp - tw * sp) * zk - (back ? HF.zb * clamp(y / 1.2) : 0);
    return [x + (L.s < 0 ? HF.sweepL || 0 : HF.sweepR || 0) * ease(clamp((y - .6) / 2.4)) + hd.sway * Math.pow(clamp(y / HF.len), 1.6), y, z];
  };
  let r = 0, y = 0, tw = 0;
  for (let i = 0; i <= n; i++) {
    const v = i / n; y = lerp(L.y0, L.y1, v);
    r = (y < .25 && back ? Math.min(aiAt(T, y), Math.sqrt(Math.max(0, 1.13 * 1.13 - y * y * .85)) * lerp(.84, 1, clamp(y / .25 + 1))) : aiAt(T, y)) * lerp(1, L.sp, clamp(y / .8));
    const wv = (.25 + .75 * Math.pow(v, HF.wp || .7)) * L.amp, ph = TAU * (y - L.y0) / HF.wl + L.ph; r += wv * Math.sin(ph); tw = .5 * wv * Math.sin(ph + 1.3);
    pts.push(radial(r, y, tw));
  }
  const cu = L.curl * (L.curlIn ? -1 : 1);   // the curl
  pts.push(radial(r + cu * .5, y + Math.abs(cu) * .25, tw), radial(r + cu * 1.05, y - Math.abs(cu) * .2, tw));
  return pts;
}

// Every hanging lock of the hair (back locks and the face-framing side locks), projected and sorted back to front.
function aiLocks(hd) {
  const HF = hd.HF, out = [];
  for (const s of [-1, 1]) {
    for (let j = 0; j < HF.nb; j++) {
      const key = j * 2 + (s > 0 ? 1 : 0) + 1, h = i => hash(key * 7.31 + i * 1.97);
      out.push({ id: 'b' + key, s, phi: 1.42 + 1.66 * Math.pow(j / (HF.nb - 1), 1.1), y0: -.62 + .55 * h(1), y1: (s < 0 ? HF.lenL : HF.lenR) * (.72 + .12 * j / (HF.nb - 1) + .16 * h(2)), sp: .8 + .34 * h(3),
        w: HF.wb * (.75 + .5 * h(4)), amp: HF.amp * (.7 + .6 * h(5)), ph: HF.phj[0] * j + HF.phj[1] * h(6) + (s > 0 ? 2 : 0), curl: HF.curl * (.6 + .7 * h(7)) });
    }
    // face-framing locks: a slim one along the cheek, then two fuller ones over the front of the shoulder
    out.push({ id: 's0' + s, s, side: 1, phi: 1.2, y0: -.5, y1: HF.side * .64, sp: 1, w: HF.ws * .95, amp: HF.amp * .35, ph: s > 0 ? 1 : 2.4, curl: HF.curl * .45, curlIn: 1, lead: 1 });
    out.push({ id: 's1' + s, s, side: 1, phi: 1.34, y0: -.42, y1: HF.side, sp: 1.03, w: HF.ws, amp: HF.amp * .8, ph: s > 0 ? 2.2 : .6, curl: HF.curl });
    out.push({ id: 's2' + s, s, side: 1, phi: 1.5, y0: -.25, y1: HF.side * 1.18, sp: 1.1, w: HF.ws * 1.1, amp: HF.amp, ph: s > 0 ? 4 : 3.1, curl: HF.curl * 1.2 });
  }
  for (const L of out) {
    if (L.side && L.s < 0) L.phi += .35 * hd.s;   // turned away, the near face-framing locks sit back by the ear
    L.p3 = aiHang(hd, L); L.p2 = L.p3.map(([x, y, z]) => hd.pj(x, y, z));
    let d = 0; for (const [x, , z] of L.p3) d += hd.dp(x, z); L.d = d / L.p3.length;
  }
  return out.sort((a, b) => a.d - b.d);
}

// Paint one hanging lock: navy at the root, two lighter washes toward the tip by depth, darker the farther back it sits.
function aiPaintLock(hd, L) {
  const S = AI_S, P = S.P, HF = hd.HF, k = hd.k;
  const C = L.p2.map(p => hd.Hh(p[0], p[1])), n = C.length;
  const v0 = L.side ? .14 : .26, Wd = C.map((_, i) => { const v = i / (n - 1); return L.w * k * (v < v0 ? .4 + .6 * v / v0 : 1 - .96 * Math.pow(Math.max(0, (v - .3) / .7), 1.6)); });
  const dk = clamp(-L.d * .5) * .22 + (L.side ? 0 : .06), tone = c => mixCol(c, P.hair0, dk);
  const ya = L.y0, yb = L.y1, G = L.side ? HF.gradS || HF.grad : HF.grad, washes = [[0, tone(mixCol(P.hair1, P.hair0, L.side ? .4 : .25))]];
  for (const g of [.2, .6]) {
    const yt = lerp(G[0], G[1], g), f = (yt - ya) / (yb - ya) + (hash(g * 13 + L.phi * 7 + L.s) - .5) * .12;
    if (f > .06 && f < .9) washes.push([f, tone(aiHairAt({ grad: G }, yt + (G[1] - G[0]) * .36))]);
  }
  // the edge toward the silhouette gets the full line, heavier on the locks that make the outline
  const outerL = L.s < 0 || hd.view === 'side', rim = !L.side && Math.abs(Math.sin(L.phi + hd.yaw * L.s)) > .93 ? 1.6 : 1;
  aiLock(C, Wd, washes, { seed: L.id.length * 3 + L.s + L.phi, inkFrom: L.side ? .18 : outerL ? .3 : .55, inkFromR: L.side ? .18 : outerL ? .55 : .3, sw: S.sw * (L.lead ? .66 : .62),
    wL: outerL ? rim : 1, wR: outerL ? 1 : rim });
}

// The dark mass behind the back locks (the gaps between them), spanning the locks' own projected spread.
function aiHairMass(hd, locks) {
  const nb = 14, y0 = -.6, y1 = hd.HF.len * .78, lo = Array(nb + 1).fill(Infinity), hi = Array(nb + 1).fill(-Infinity);
  for (const L of locks) for (const [x, y] of L.p2) { const j = Math.round((y - y0) / (y1 - y0) * nb); if (j < 0 || j > nb) continue; lo[j] = Math.min(lo[j], x - L.w * .3); hi[j] = Math.max(hi[j], x + L.w * .3); }
  const Lp = [], Rp = [];
  for (let j = 0; j <= nb; j++) if (lo[j] < hi[j]) { const y = lerp(y0, y1, j / nb), m = (lo[j] + hi[j]) / 2, t = 1 - .75 * Math.pow(clamp((j - nb + 4) / 4), 2); Lp.push([m + (lo[j] - m) * t, y]); Rp.push([m + (hi[j] - m) * t, y]); }
  return Lp.concat(Rp.reverse());
}

// Pass 1 (behind her body): the dark mass, then the back locks, back to front.
function aiHairBack(hd) {
  const S = AI_S, P = S.P, HF = hd.HF, rs = hd.A.rs, locks = aiLocks(hd).filter(L => L.d < .05);
  // a lock that hangs wholly behind her body (seen from the front: inside |x| < .8 below the chin) is never painted
  const seen = L => hd.s > .5 || L.p2.some(([x, y]) => Math.abs(x) > (y < .9 ? 1.0 : .8));
  rs('hairmass');
  const M = aiHairMass(hd, locks);
  if (M.length > 5) {
    const MP = aiLoop(M, 3), G = HF.grad;
    aiPaint(MP.map(p => hd.Hh(p[0], p[1])), { wash: mixCol(P.hair0, P.hairInk, .08), ink: null });
    for (const [g, col] of [[.22, mixCol(P.hair1, P.hair0, .45)], [.55, mixCol(P.hair1, P.hair2, .3)]]) {
      const lo = aiClipWave(MP, lerp(G[0], G[1], g), .22, 3, 1.3 + g * 4);
      if (lo.length > 2) aiPaint(lo.map(p => hd.Hh(p[0], p[1])), { wash: col, op: 235, ink: null });
    }
  }
  for (const L of locks) if (seen(L)) { rs('lock ' + L.id); aiPaintLock(hd, L); }
}

// The bangs (and the strands across them) as centrelines in px, in paint order. A bang hangs from the crown over the
// sphere of the head, bowing outward, with a slight S.
function aiBangLocks(hd, list) {
  const out = [];
  list.forEach((b, i) => {
    const [rx, ry, tx, ty, w, bow, sc] = b, dx = tx - rx, dy = ty - ry, d = Math.hypot(dx, dy) || 1, f = tx < 0 ? 1 : -1, nx = -dy / d * f, ny = dx / d * f;
    const P3 = [];
    for (let j = 0; j <= 6; j++) { const v = j / 6, o = bow * Math.sin(Math.PI * v) + sc * Math.sin(TAU * v), x = rx + dx * v + nx * o, y = ry + dy * v + ny * o; P3.push([x, y, Math.sqrt(Math.max(.02, 1.02 * 1.02 - x * x - y * y * .85))]); }
    let dd = 0; for (const [x, , z] of P3) dd += hd.dp(x, z);
    out.push({ i, w, P3, key: i + hd.s * 12 * dd / P3.length, C: P3.map(([x, y, z]) => { const p = hd.pj(x, y, z); return hd.H(p[0], p[1]); }) });
  });
  return out.sort((a, b) => a.key - b.key);
}
// Each bang is washed, given its piece of the shine band, and inked in turn (so it covers the ones behind it); then the
// whole fringe gets two glazes, one colour each (p5.brush pays for every change of colour).
function aiBangs(hd) {
  const S = AI_S, P = S.P, k = hd.k, base = mixCol(P.hair1, P.hair0, .15), Es = [];
  // the shine: where the crown's arc crosses a bang, a glossy piece of a horizontal band between the bang's (inset)
  // edges, painted with the bang so the next one covers it and the lines break the band into pieces
  const Y = x => AI_SHINE[0] + AI_SHINE[1] * x * x, onHead = ([x, y]) => { const p = hd.pj(x, y, Math.sqrt(Math.max(.02, 1.02 * 1.02 - x * x - y * y * .85))); return hd.H(p[0], p[1]); };
  const piece = (c, d, w, hh, ins, oy = 0) => {   // the band's strip y = Y(x) + oy ± hh between the bang's two (inset) edges
    const n = [-d[1], d[0]], e = w * .5 * (1 - ins), at = (s0, dy) => { const q = [c[0] + n[0] * e * s0, c[1] + n[1] * e * s0], yy = Y(q[0]) + oy + dy, t = (yy - q[1]) / (Math.abs(d[1]) > .2 ? d[1] : .2); return [q[0] + d[0] * t, yy]; };
    return aiLoop([at(-1, -hh), at(0, -hh * 1.15), at(1, -hh), at(1.08, 0), at(1, hh), at(0, hh * 1.1), at(-1, hh), at(-1.08, 0)].map(onHead), 2);
  };
  const shine = (B, sd) => {
    for (let j = 0; j < B.P3.length - 1; j++) {
      const a = B.P3[j], b = B.P3[j + 1], fa = a[1] - Y(a[0]), fb = b[1] - Y(b[0]); if (!(fa <= 0 && fb > 0)) continue;
      const t = fa / (fa - fb), c = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, d = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], oy = (hash(sd + 2) - .5) * .03;
      if (Math.abs(c[0]) > .85) return;
      const hh = (.06 + .025 * hash(sd)) * (1 - .45 * Math.abs(c[0]));
      aiPaint(piece(c, d, B.w, hh, .3 + .15 * hash(sd + 1), oy), { wash: mixCol(P.hairHi, P.hair4, .7), op: 245, ink: null });
      if (Math.abs(c[0]) < .3) aiPaint(piece([c[0] - .02, c[1]], d, B.w * .7, hh * .3, .25, oy - hh * .2), { wash: mixCol(P.hair4, '#FFFFFF', .65), op: 230, ink: null });   // the white core
      return;
    }
  };
  for (const B of aiBangLocks(hd, AI_BANGS)) {
    hd.A.rs('bang ' + B.i);
    const n = B.C.length, Wd = B.C.map((_, j) => { const v = j / (n - 1); return B.w * k * (v < .2 ? .75 + 1.25 * v : 1 - .97 * Math.pow((v - .2) / .8, 1.9)); });
    Es.push([aiLock(B.C, Wd, [[0, base]], { seed: B.i * 3.3, inkFrom: B.i < 2 ? .42 : .55, inkFromR: B.i < 2 ? .42 : .5, sw: S.sw * .55, mid: S.u > 12 ? () => shine(B, B.i * 3.3) : null }), B.i * 3.3]);
  }
  // then two glazes over the whole fringe, one colour each: the crown's shade above the shine, lighter tips
  hd.A.rs('bangglaze');
  for (const [E, sd] of Es) aiPaint(aiRootTongue(E, .22, sd), { wash: P.hair0, op: 60, ink: null });
  for (const [E, sd] of Es) aiPaint(aiTongue(E, .72, 1, sd), { wash: mixCol(P.hair1, P.hair2, .6), op: 140, ink: null });
  hd.A.rs('strands');
  const St = aiBangLocks(hd, AI_STRANDS).map(B => aiRib(B.C, B.C.map((_, j) => B.w * k * (1 - .9 * j / (B.C.length - 1))), 4));
  for (const E of St) aiPaint(aiRibPts(E), { wash: mixCol(P.hair1, P.hair0, .3), ink: null });
  for (const E of St) { const m = E.L.length - 1, i0 = Math.round(m * .1); aiLine(E.L.slice(i0), S.sw * .3, P.hairInk, P.br); aiLine(E.R.slice(i0), S.sw * .3, P.hairInk, P.br); }
}
// The soft shadow the bangs cast on the forehead: each bang shifted down, in the skin's shadow colour, on the face only.
function aiBangShadow(hd) {
  const P = AI_S.P, k = hd.k;
  for (const B of aiBangLocks(hd, AI_BANGS)) {
    const E = aiRib(B.C.map(([x, y]) => [x + .02 * k, y + .09 * k]), B.C.map((_, j) => B.w * k * (j < 2 ? .85 : 1 - .9 * Math.pow((j - 1.5) / 4.5, 1.9))), 3);
    const xl = -.95 + .2 * hd.s, xr = .95 + .2 * hd.s;
    let Q = aiClipHalf(aiRibPts(E), hd.H(-2, -.42), hd.H(2, -.42)); Q = aiClipHalf(Q, hd.H(xl, 2), hd.H(xl, -2)); Q = aiClipHalf(Q, hd.H(xr, -2), hd.H(xr, 2));
    if (Q.length > 2) aiPaint(Q, { wash: mixCol(P.skinSh, P.cheek, .35), op: 200, ink: null });
  }
}

// The skull's hair: a disk a little bigger than the cranium (its lower half tucks behind the face), darker at the crown.
function aiCap(hd) {
  const S = AI_S, P = S.P, H = hd.H, cap = [];
  const [cw, ch] = hd.HF.crown, top = a => -.02 - ch * Math.pow(Math.abs(Math.sin(a)), .8);   // a full, round crown
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, sn = Math.sin(a); cap.push(H(Math.cos(a) * cw * (1 + .02 * Math.sin(i * 2.3)), sn < 0 ? top(a) : -.02 + sn * .78)); }
  aiPaint(cap, { wash: mixCol(P.hair1, P.hair0, .3), ink: null });
  const cr = [];   // the crown's shade: a crescent along the top
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.08 + .84 * i / 12); cr.push(H(Math.cos(a) * (cw - .04), top(a) + .03)); }
  for (let i = 12; i >= 0; i--) { const a = Math.PI * (1.08 + .84 * i / 12); cr.push(H(Math.cos(a) * .95, .06 + Math.sin(a) * .86)); }
  aiPaint(cr, { wash: P.hair0, op: 140, ink: null });
  const rim = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (1.02 + .96 * i / 16); rim.push(H(Math.cos(a) * cw, top(a))); }
  aiLine(rim, S.sw * .75, P.ink, P.brS);
}
// Stray hairs off the silhouette.
function aiFlyaways(hd) {
  const S = AI_S, P = S.P;
  for (const f of [[[-.5, -1.0], [-.7, -1.13], [-.9, -1.1]], [[.32, -1.05], [.48, -1.19], [.64, -1.2]], [[-1.08, -.25], [-1.25, -.38], [-1.38, -.32]], [[1.06, -.1], [1.24, -.22], [1.36, -.15]], [[-.02, -1.06], [.06, -1.2], [.0, -1.28]]]) {
    const P2 = f.map(([x, y]) => { const z = Math.sqrt(Math.max(0, 1.2 * 1.2 - x * x - y * y)), p = hd.pj(x, y, z); return hd.H(p[0], p[1]); });
    aiLine(P2, S.sw * .3, P.hairInk, P.br);
  }
}

// The face: a proper shape (cheeks and chin) under the bangs, with its features. Eyes and mouth are the reference ones.
function aiFace(hd) {
  const S = AI_S, P = S.P, F = hd.F, A = hd.A, rs = A.rs, sw = S.swF, side = hd.view === 'side', H = hd.H;
  const map = pts => pts.map(p => { const h = H(p[0], p[1]); return p[2] ? [h[0], h[1], 1] : h; });
  let FL;
  if (side) FL = AI_PROFILE;
  else { const R = [], L = []; for (const [y, w, zc] of F.fw) { R.push([zc * hd.s + w, y]); L.push([zc * hd.s - w, y]); } FL = R.concat(L.slice(0, -1).reverse()); }
  rs('face');
  aiPaint(aiLoop(map(FL), 4), { wash: P.skin, ink: null });
  if (side) {
    aiPaint(aiLoop(map([[.3, .02], [.9, -.06], [.9, .2], [.66, .24], [.42, .36]]), 3), { wash: P.skinSh, op: 160, ink: null });
    aiPaint(aiLoop(map([[.08, .8], [.3, 1.0], [.55, 1.07], [.5, .96], [.3, .86]]), 3), { wash: P.skinSh, op: 130, ink: null });
    aiLine(aiCurve(map(FL.slice(2, FL.length - 1)), 4), sw * .75, P.ink);
  } else {
    const Rr = FL.slice(0, F.fw.length).filter(p => p[1] >= .22);   // shade down the far cheek and under the jaw
    const inner = Rr.map(([x, y]) => [x - .11 - .06 * clamp((y - .6) * 2), y - .05]).reverse();
    aiPaint(map(aiCurve(Rr, 3).concat(aiCurve(inner, 3))), { wash: P.skinSh, op: 120, ink: null });
    const i0 = FL.findIndex(p => p[1] > .12), i1 = FL.length - 1 - FL.slice().reverse().findIndex(p => p[1] > .12);
    aiLine(aiCurve(map(FL.slice(i0, i1 + 1)), 4), sw * .7, P.ink);
  }
  rs('bangshadow'); aiBangShadow(hd);
  rs('cheeks');
  const fx = x => { const a = Math.asin(clamp(x, -1, 1)), z = Math.cos(a) * .9; return [x * hd.c + z * hd.s, clamp(Math.cos(a + hd.yaw) / Math.cos(a), .3, 1.04)]; };
  const bl = side ? [[.62, .7]] : [-1, 1].map(s => fx(s * F.blushX));
  for (const [bx, wk] of bl) {
    aiPaint(map(aiEll(bx, F.blushY, F.blushR * 1.15 * wk, F.blushR * .62, 16)), { wash: P.cheek, op: 70 * clamp(A.blush + .3), ink: null });
    aiPaint(map(aiEll(bx, F.blushY, F.blushR * .8 * wk, F.blushR * .42, 16)), { wash: P.cheek, op: 130 * clamp(A.blush + .3), ink: null });
    if (A.blush > .55) for (let i = 0; i < 3; i++) aiLine(map([[bx + (i - 1) * .06 * wk + .025, F.blushY - .035], [bx + (i - 1) * .06 * wk - .015, F.blushY + .035]]), sw * .35, mixCol(P.cheek, P.ink, .25));
  }
  rs('nose');
  if (!side) { const nx = F.noseX * hd.c + 1.0 * hd.s; if (hd.s > .1) aiLine(map([[nx + .02, F.noseY - .05], [nx + .045, F.noseY + .01], [nx + .01, F.noseY + .025]]), sw * .45, mixCol(P.skinSh, P.ink, .35)); else aiPaint(map(aiEll(nx, F.noseY, .012, .012, 6)), { wash: mixCol(P.skinSh, P.ink, .3), ink: null }); }
  rs('mouth');
  { const m = side ? [.84, F.mouthY - .03] : [.9 * hd.s, F.mouthY], wm = side ? .45 : hd.c * .95 + .05;
    aiMouthR(p => H(m[0] + (p[0] - m[0]) * wm, p[1]), m, F.mz, A.mouth); }
  rs('eyes');
  const eyes = side ? [[[.6, F.eyeY], -1, .5]] : [-1, 1].map(s => { const [x, wk] = fx(s * F.eyeX); return [[x, F.eyeY], s, wk]; });
  for (const [c, s, wk] of eyes) aiEyeR(p => H(p[0], p[1]), c, F.ehw, F.ehh, s, wk, A.eye);
  if (P.glowK && S.k > 25 && A.eye.kind !== 'blank' && A.eye.lid < .8) for (const [c] of eyes) { const p = H(c[0], c[1]); aiGlow(p[0], p[1], F.ehh * hd.k * 1.6, P.rim, .55 * P.glowK); }
  return eyes;
}

// Pass 2 (in front of her body): far fin, skull, face, near fins, bangs, the headdress (hd.onBand), the face-framing
// locks, shine, flyaways, brows.
// fins(which) paints this form's fins: 'far' (behind the skull, turned views) or 'near'.
function aiHeadFront(hd, fins) {
  const S = AI_S, P = S.P, A = hd.A, rs = A.rs, F = hd.F;
  const front = aiLocks(hd).filter(L => L.d >= .05);
  rs('finfar'); fins('far');
  rs('cap'); aiCap(hd);
  const eyes = aiFace(hd);
  for (const L of front) if (!L.side) { rs('lock ' + L.id); aiPaintLock(hd, L); }
  aiBangs(hd);
  if (hd.onBand) hd.onBand();   // the headdress sits on the crown, its ends tucked under the face-framing locks
  for (const L of front) if (L.side && !L.lead) { rs('lock ' + L.id); aiPaintLock(hd, L); }
  rs('fins'); fins('near');   // the fins sit over the side hair, their roots under the slim locks along the cheeks
  for (const L of front) if (L.lead) { rs('lock ' + L.id); aiPaintLock(hd, L); }
  rs('fly'); if (S.u > 12) aiFlyaways(hd);
  rs('brows');
  if (Math.abs(A.brow) > .05) for (const [c, s, wk] of eyes) {   // brows show through the bangs only when she acts
    const b = A.brow, y = c[1] - F.ehh * 1.5 - Math.max(0, -b) * .06, w = F.ehw * wk;
    aiLine(aiCurve([[-.6, .02 - Math.max(0, b) * .06], [0, -.02], [.7, .02 + Math.max(0, b) * .03]].map(([x, yy]) => hd.H(c[0] + s * x * w, y + yy)), 4), S.swF * (.55 + .45 * Math.abs(b)), mixCol(P.hairInk, P.hair1, .35));
  }
}
// The procedural full form's head (front / q / side): ahoge behind, the two passes' front half, the headdress on top.
function aiHeadFull(hd) {
  const A = hd.A, rs = A.rs, H = hd.H, F = hd.F, side = hd.view === 'side';
  rs('ahoge'); aiAhoge(H, .06 * hd.c + Math.sqrt(Math.max(0, 1.06 - .0036 - 1)) * hd.s - (side ? .12 : 0), A.ahoge);
  hd.onBand = () => { rs('headdress'); aiHeaddress(H, hd.view, F); };
  aiHeadFront(hd, which => {
    for (const s of side ? [-1] : [-1, 1]) {
      const far = !side && hd.dp(s * .88, 0) < -.05; if ((which === 'far') !== far) continue;
      aiFin(H, side ? -.12 : s * .88 * hd.c, F.finY + (side ? .04 : 0), s, A.fin, F.finL * (far ? .6 : side ? .9 : 1), A.flap * s);
    }
  });
}

// Whale-fin ear at (ax, ay) head units, pointing outward s (-1 left), lift = -1 droop .. 1 perk, L = length: a flipper,
// dark on top with a pale scalloped underside.
function aiFin(H, ax, ay, s, lift, L, flap = 0) {
  const P = AI_S.P, sw = AI_S.swF, a = .42 - lift * .42 + flap;
  const R = (x, y) => { const c = Math.cos(a), sn = Math.sin(a), X = x * L, Y = y * L; return H(ax + s * (X * c - Y * sn), ay + X * sn + Y * c); };
  const M = pts => pts.map(p => { const q = R(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; });
  const out = [[-.08, -.26], [.28, -.3], [.62, -.22], [.88, -.06], [1.06, .16, 1], [.84, .16], [.62, .22], [.38, .3], [.12, .36], [-.08, .3]];
  aiPaint(aiLoop(M(out), 4), { wash: P.fin, ink: P.ink, sw: sw * .7 });
  const inn = [[.0, .1], [.3, .1], [.6, .05], [.9, .1, 1], [.74, .16], [.66, .2], [.54, .2], [.44, .27], [.3, .28], [.18, .34], [.04, .3]];
  aiPaint(aiLoop(M(inn), 3), { wash: P.finIn, ink: null });
  aiLine(M([[.1, -.12], [.45, -.14], [.78, -.04]]), sw * .35, mixCol(P.fin, P.finIn, .45));
  aiLine(M([[.08, .0], [.4, -.02], [.7, .02]]), sw * .28, mixCol(P.fin, P.finIn, .3));
  aiLine(M([[-.02, -.2], [.3, -.25], [.6, -.18]]), sw * .3, mixCol(P.fin, P.hi, .35));
}

// ---------- hair helpers ----------
// A clump: a ribbon from root to tip, washed root-dark to tip-light. Each lighter step starts with a pointed tongue
// reaching up the clump (the anime "dip-dyed" gradient), then the clump is inked once.
function aiClump(Pts, Wd, o = {}) {
  const S = AI_S, C = S.P, E = aiRib(Pts, Wd, 5), m = E.L.length - 1;
  const bands = o.bands || [[0, C.hair0], [.2, C.hair1], [.47, C.hair2], [.67, C.hair3], [.85, C.hair4]];
  for (let b = 0; b < bands.length; b++) {
    const [a, col] = bands[b];
    if (!a) { aiPaint(aiRibPts(E), { wash: col, ink: null }); continue; }
    const tong = .07 + .05 * hash(b * 3.1 + (o.seed || 0)), ic = clamp(Math.round(a * m), 0, m), ie = clamp(Math.round((a + tong) * m), 0, m);
    const side = hash(b + (o.seed || 0) * 1.7) < .5 ? .3 : .7, apex = [lerp(E.L[ic][0], E.R[ic][0], side), lerp(E.L[ic][1], E.R[ic][1], side)];
    aiPaint([apex].concat(E.L.slice(ie)).concat(E.R.slice(ie).reverse()), { wash: col, ink: null, op: o.op ?? 255 });
  }
  if (o.shade) aiPaint(E.R.slice(Math.round(m * .08), Math.round(m * .7)).concat(E.C.slice(Math.round(m * .08), Math.round(m * .7)).reverse()), { wash: C.hair0, op: 80, ink: null, hatch: S.u > 30 ? aiHatch(C.hair0, .5) : null });
  aiPaint(aiRibPts(E), { ink: C.hairInk, sw: (o.sw ?? S.sw * .75) * (o.fine ? .85 : .7), br: o.fine ? S.P.br : S.P.brS });
  if (o.hi !== false && m > 8) {   // a light streak on the lit edge
    const a = Math.round(m * (o.hiA ?? .14)), b = Math.round(m * (o.hiB ?? .5));
    aiLine(E.C.slice(a, b).map((p, i) => [lerp(p[0], E.L[a + i][0], .62), lerp(p[1], E.L[a + i][1], .62)]), S.sw * .38, mixCol(C.hair2, C.hair4, .45));
  }
  if (o.strand !== false) {   // a strand line down the clump's upper part
    const a = Math.round(m * .1), b = Math.round(m * (o.strandTo ?? .6)), f = o.strandSide ?? .3;
    aiLine(E.C.slice(a, b).map((p, i) => [lerp(p[0], E.L[a + i][0], f), lerp(p[1], E.L[a + i][1], f)]), S.sw * .32, mixCol(C.hairInk, C.hair2, .35));
  }
  return E;
}

// The ahoge: one big curl from the crown at x = bx (head units). wob = sideways spring (rad).
function aiAhoge(H, bx, wob) {
  const C = AI_S.P, base = [bx, -1.0];
  const P0 = [[0, 0], [-.04, -.32], [-.2, -.6], [-.48, -.66], [-.62, -.5], [-.55, -.34]];
  const pts = P0.map(([a, b], i) => { const r = aiRot([a, b], [0, 0], wob * i / 5); return H(base[0] + r[0], base[1] + r[1]); });
  aiClump(pts, [.13, .13, .11, .085, .055, .01].map(v => v * AI_S.k), { bands: [[0, C.hair1], [.55, C.hair2]], strand: false, sw: AI_S.sw * .6 });
}

// The maid headdress: a band over the crown with a scalloped frill behind it, and a light-blue bow.
function aiHeaddress(H, view, F) {
  const S = AI_S, C = S.P, sw = S.swF;
  if (view === 'side') {   // in profile: a band from the crown down behind the ear, the frill standing up behind it
    const L = aiCurve([[.42, -1.04], [.2, -1.03], [-.02, -.88], [-.14, -.58], [-.18, -.26], [-.16, -.02]], 6), m = L.length;
    const nrm = i => { const a = L[Math.max(0, i - 1)], b = L[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dy / d, -dx / d]; };
    const out = L.map((p, i) => { const n = nrm(i), r = .07 + .2 * Math.pow(Math.abs(Math.sin(i / (m - 1) * 6 * Math.PI)), .45); return [p[0] - n[0] * r, p[1] - n[1] * r]; });
    aiPaint(out.concat(L.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .55 });
    const b1 = L.map((p, i) => { const n = nrm(i); return [p[0] - n[0] * .07, p[1] - n[1] * .07]; }), b2 = L.map((p, i) => { const n = nrm(i); return [p[0] + n[0] * .06, p[1] + n[1] * .06]; });
    aiPaint(b1.concat(b2.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .5 });
    aiLine(L.map(p => H(p[0], p[1])), sw * .3, C.creamSh);
    return;
  }
  const q = view === 'q';
  const cx = q ? .02 : 0, rx = 1.0, ry = .97, a0 = -160, a1 = -20;
  const arc = (r, n, f = () => 0) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180, rr = r + f(t); o.push([cx + Math.cos(a) * rx * rr, .02 + Math.sin(a) * ry * rr]); } return o; };
  const n = 11, sc = t => .21 * Math.pow(Math.abs(Math.sin(t * n * Math.PI)), .45);
  const inner = arc(1.03, 40), outer = arc(1.07, 60, t => sc(t) + .02);
  aiPaint(outer.concat(inner.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  for (let j = 1; j < n; j++) {   // crease lines into each scallop valley
    const t = j / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180;
    aiLine([H(cx + Math.cos(a) * rx * 1.08, .02 + Math.sin(a) * ry * 1.08), H(cx + Math.cos(a) * rx * 1.2, .02 + Math.sin(a) * ry * 1.2)], sw * .3, C.creamSh);
  }
  const bandO = arc(1.09, 30), bandI = arc(.96, 30);
  aiPaint(bandO.concat(bandI.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiLine(arc(1.0, 24).map(p => H(p[0], p[1])), sw * .3, C.creamSh);
  // the light-blue bow at the screen-right end of the band
  const bp = q ? [.88, -.36] : [.9, -.32], bs = (F === AI_FACE.chibi ? 1.0 : .95) * (q ? .85 : 1), ra = -.45;
  const B = pts => pts.map(([a, b, c]) => { const r = aiRot([a * bs, b * bs], [0, 0], ra), h = H(bp[0] + r[0], bp[1] + r[1]); return c ? [h[0], h[1], 1] : h; });
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[0, 0, 1], [sd * .1, -.13], [sd * .24, -.14], [sd * .26, .0], [sd * .2, .09], [sd * .06, .05]]), 4), { wash: C.bow, ink: C.ink, sw: sw * .5 });
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[sd * .02, .03], [sd * .08, .14], [sd * .1, .26, 1], [sd * .15, .21], [sd * .2, .25, 1], [sd * .07, .03]]), 3), { wash: C.bowSh, ink: C.ink, sw: sw * .4 });
  aiPaint(aiLoop(B([[-.05, -.04], [.05, -.04], [.055, .045], [-.055, .045]]), 3), { wash: C.bowSh, ink: C.ink, sw: sw * .45 });
  for (const sd of [-1, 1]) aiLine(B([[sd * .08, -.02], [sd * .17, -.07]]), sw * .3, C.bowSh);
}

// ---------- body ----------
// Form geometry, in u (body-local: x right, y up is negative, soles at y = 0, crown at y = -10).
const AI_FORM = {
  full: {
    k: .72, hc: [0, -9.28],
    neck: [-8.75, -8.3, .115], shY: -8.12, shW: .8, armpitY: -7.42, armW: .7, bustY: -7.22, waistY: -6.62, waistW: .46,
    skirt: [-6.62, .48, -1.62, 1.8], petti: .3, apron: [-6.62, .42, -3.5, .74, .15],
    arm: [1.22, 1.1, .4], armWd: [.27, .25, .22, .2], puff: [.24, .2],
    leg: [.22, -1.75, -.95, -.3, .27, .4], tail: [[.5, -3.2], [1.25, -2.85], [1.78, -3.25], [1.98, -3.95], [1.98, -4.6]], tailW: [.5, .46, .37, .27, .18], fluke: .8,
    bow: .9, whale: .3, emb: 12
  },
  chibi: {
    k: 2.6, hc: [0, -7.1],
    neck: [-6.5, -5.95, .2], shY: -5.95, shW: .66, armpitY: -5.55, armW: .62, bustY: -5.42, waistY: -4.85, waistW: .56,
    skirt: [-4.85, .58, -1.62, 1.62], petti: .32, apron: [-4.85, .48, -2.55, .9, .18],
    arm: [.8, .7, .46], armWd: [.38, .36, .34, .32], puff: [.25, .22],
    leg: [.36, -1.75, -1.05, -.38, .38, .56], tail: [[.6, -2.3], [1.3, -1.8], [1.88, -2.0], [2.15, -2.6], [2.2, -3.2]], tailW: [.55, .52, .43, .32, .21], fluke: .85,
    bow: 1.15, whale: .36, emb: 9
  }
};

// A frilled band along a polyline: the scalloped edge sits d to the left of the path direction (d < 0: to the right).
// Valley creases and fluting lines make it read as a real ruffle; o.double adds a deeper, shaded ruffle behind it.
function aiFrill(Pts, d, n, o = {}) {
  const S = AI_S, C = S.P, Cv = aiCurve(Pts, Math.max(4, Math.ceil(n * 7 / (Pts.length - 1)))), m = Cv.length, inner = [], outer = [], outer2 = [];
  for (let i = 0; i < m; i++) {
    const a = Cv[Math.max(0, i - 1)], b = Cv[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1;
    const t = i / (m - 1), bump = Math.pow(Math.abs(Math.sin(t * n * Math.PI)), .5), r = d * (.5 + .5 * bump);
    const r2 = d * 1.45 * (.55 + .45 * Math.pow(Math.abs(Math.cos(t * n * Math.PI)), .5));
    inner.push(Cv[i]); outer.push([Cv[i][0] - dy / dd * r, Cv[i][1] + dx / dd * r]); outer2.push([Cv[i][0] - dy / dd * r2, Cv[i][1] + dx / dd * r2]);
  }
  const sw = o.sw ?? S.sw * .55;
  if (o.double) aiPaint(inner.concat(outer2.slice().reverse()), { wash: mixCol(C.cream, C.creamSh, .45), ink: C.ink, sw: sw * .8 });
  aiPaint(inner.concat(outer.slice().reverse()), { wash: o.col || C.cream, ink: C.ink, sw });
  if (o.shade) aiPaint(inner.concat(inner.map((p, i) => [lerp(p[0], outer[i][0], .38), lerp(p[1], outer[i][1], .38)]).reverse()), { wash: C.creamSh, op: 120, ink: null });
  for (let j = 1; j < n; j++) { const i = Math.round(j / n * (m - 1)); aiLine([inner[i], [lerp(inner[i][0], outer[i][0], .8), lerp(inner[i][1], outer[i][1], .8)]], S.sw * .3, mixCol(C.creamSh, C.ink, .15)); }
  if (S.u > 25 && o.flute !== false) for (let j = 0; j < n; j++) { const i = Math.round((j + .5) / n * (m - 1)); aiLine([[lerp(inner[i][0], outer[i][0], .25), lerp(inner[i][1], outer[i][1], .25)], [lerp(inner[i][0], outer[i][0], .7), lerp(inner[i][1], outer[i][1], .7)]], S.sw * .22, C.creamSh); }
}

// A hand at p, pointing along angle a (rad, 0 = +x), length L. kind: relax | open | fist. th = thumb side (+1 / -1).
function aiHand(p, a, L, kind, th, chibi) {
  const C = AI_S.P, sw = AI_S.sw * .55;
  const R = (x, y) => { const c = Math.cos(a), n = Math.sin(a); return [p[0] + (x * c - y * th * n) * L, p[1] + (x * n + y * th * c) * L]; };
  const M = pts => pts.map(q => q[2] ? [...R(q[0], q[1]), 1] : R(q[0], q[1]));
  if (chibi || kind === 'fist') {   // a round little fist
    aiPaint(aiLoop(M([[-.05, -.4], [.35, -.46], [.62, -.42], [.8, -.3], [.92, -.1], [.95, .1], [.84, .3], [.62, .42], [.3, .45], [-.05, .32]]), 4), { wash: C.skin, ink: C.ink, sw });
    for (const k of [-.18, .02, .2]) aiLine(M([[.62, k - .06], [.8, k], [.88, k + .05]]), sw * .45, mixCol(C.skinSh, C.ink, .3));
    aiPaint(aiLoop(M([[.05, -.3], [.4, -.38], [.62, -.3], [.58, -.18], [.3, -.16], [.08, -.12]]), 3), { wash: C.skin, ink: C.ink, sw: sw * .8 });
    return;
  }
  if (kind === 'open') {   // palm out, fingers a little apart (waving, offering)
    aiPaint(aiLoop(M([[0, -.25], [.42, -.3], [.6, -.34], [1.02, -.32, 1], [.66, -.17], [1.12, -.1, 1], [.68, 0], [1.06, .12, 1], [.64, .13], [.9, .3, 1], [.52, .28], [.45, .38], [.62, .62, 1], [.3, .5], [.0, .3]]), 3), { wash: C.skin, ink: C.ink, sw });
    return;
  }
  // relaxed: a tapered palm, the fingers together and gently curled (separations drawn), the thumb along the near edge
  aiPaint(aiLoop(M([[.08, -.17], [.3, -.36], [.52, -.45], [.62, -.38], [.5, -.24], [.32, -.16]]), 3), { wash: C.skin, ink: C.ink, sw });
  aiPaint(aiLoop(M([[0, -.21], [.28, -.26], [.52, -.27], [.8, -.24], [1.0, -.16], [1.08, -.03], [1.04, .11], [.92, .2], [.62, .26], [.3, .25], [0, .22]]), 4), { wash: C.skin, ink: C.ink, sw });
  if (L > 14) for (const [y0, y1, x1] of [[-.13, -.1, .97], [.01, .03, 1.03], [.14, .15, .95]]) aiLine(M([[.56, y0], [.78, (y0 + y1) / 2 + .01], [x1, y1]]), sw * .45, mixCol(C.skinSh, C.ink, .25));
  aiPaint(aiLoop(M([[.12, .05], [.45, .1], [.5, .2], [.15, .18]]), 3), { wash: C.skinSh, op: 130, ink: null });
}

// Arm on side s. part: 'upper' (puff and upper sleeve) | 'lower' (forearm, cuff, hand) | 'all'.
function aiArm(G, B, s, a, e, hand, part, dark, prof) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [lu, lf, lh] = G.arm, Wd = G.armWd;
  const Sh = [B(s * G.shW * 1.0) + -s * .06 * u, G.shY * u + .16 * u];
  const d1 = [s * Math.sin(a), Math.cos(a)], E = [Sh[0] + d1[0] * lu * u, Sh[1] + d1[1] * lu * u];
  const a2 = prof ? a + e : a - e, d2 = [s * Math.sin(a2), Math.cos(a2)], rk = 1 - .3 * clamp(e / 1.0), Wr = [E[0] + d2[0] * lf * rk * u, E[1] + d2[1] * lf * rk * u];
  const navy = dark ? C.navySh : C.navy, sh = dark ? mixCol(C.navySh, C.ink, .3) : C.navySh;
  if (part !== 'lower') {
    const up = [Sh, [lerp(Sh[0], E[0], .5), lerp(Sh[1], E[1], .5)], E];
    const R = aiRib(up, [Wd[0] * u, Wd[1] * u, Wd[1] * u], 4);
    aiPaint(aiRibPts(R), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    const pc = [Sh[0] + d1[0] * .1 * u, Sh[1] + d1[1] * .1 * u - .04 * u];
    const pa = Math.atan2(d1[1], d1[0]) - Math.PI / 2, PR = (x, y) => { const c = Math.cos(pa), n = Math.sin(pa); return [pc[0] + (x * c - y * n) * u, pc[1] + (x * n + y * c) * u]; };
    aiPaint(aiEll(pc[0], pc[1], G.puff[0] * u, G.puff[1] * u, 18, pa), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    aiPaint(aiLoop([PR(-G.puff[0] * .7, -G.puff[1] * .55), PR(-G.puff[0] * .1, -G.puff[1] * .92), PR(G.puff[0] * .5, -G.puff[1] * .7), PR(0, -G.puff[1] * .5)], 3), { wash: dark ? C.navy : C.navyHi, op: 160, ink: null });
    for (const k of [-.5, 0, .5]) aiLine([PR(k * G.puff[0] * .5, G.puff[1] * .85), PR(k * G.puff[0] * .8, G.puff[1] * .25)], sw * .3, sh);
    aiLine([[pc[0] - s * .1 * u, pc[1] - .1 * u], [pc[0] - s * .02 * u, pc[1] + .02 * u], [pc[0] - s * .08 * u, pc[1] + .14 * u]], sw * .4, dark ? C.navy : C.navyHi);
    aiLine([[pc[0] + s * .06 * u, pc[1] - .12 * u], [pc[0] + s * .1 * u, pc[1] + .08 * u]], sw * .35, sh);
  }
  if (part !== 'upper') {
    const fo = [E, [lerp(E[0], Wr[0], .5), lerp(E[1], Wr[1], .5)], Wr];
    const R = aiRib(fo, [Wd[1] * u, Wd[2] * u, Wd[3] * u], 4);
    aiPaint(aiRibPts(R), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    aiPaint(aiEll(E[0], E[1], Wd[1] * u * .48, Wd[1] * u * .48, 12), { wash: navy, ink: null });
    aiLine([[lerp(E[0], Wr[0], .2) + s * .02 * u, lerp(E[1], Wr[1], .2)], [lerp(E[0], Wr[0], .7), lerp(E[1], Wr[1], .7)]], sw * .35, sh);
    const nE = [-d2[1], d2[0]];   // elbow creases
    for (const k of [.08, .18]) aiLine([[E[0] + d2[0] * k * u - nE[0] * .08 * u, E[1] + d2[1] * k * u - nE[1] * .08 * u], [E[0] + d2[0] * (k + .05) * u, E[1] + d2[1] * (k + .05) * u], [E[0] + d2[0] * k * u + nE[0] * .06 * u, E[1] + d2[1] * k * u + nE[1] * .06 * u]], sw * .28, sh);
    aiLine(R.L.slice(2, R.L.length - 3).map((p, i) => [lerp(p[0], R.C[i + 2][0], .3), lerp(p[1], R.C[i + 2][1], .3)]), sw * .3, dark ? C.navy : C.navyHi);
    // gold cuff band and a small cream frill
    const n = [-d2[1], d2[0]], cw = Wd[3] * u * .62, c0 = [Wr[0] - d2[0] * .12 * u, Wr[1] - d2[1] * .12 * u];
    aiPaint([[c0[0] + n[0] * cw, c0[1] + n[1] * cw], [Wr[0] + n[0] * cw, Wr[1] + n[1] * cw], [Wr[0] - n[0] * cw, Wr[1] - n[1] * cw], [c0[0] - n[0] * cw, c0[1] - n[1] * cw]], { wash: C.gold, ink: C.ink, sw: sw * .4 });
    aiFrill([[Wr[0] + n[0] * cw * 1.1, Wr[1] + n[1] * cw * 1.1], Wr, [Wr[0] - n[0] * cw * 1.1, Wr[1] - n[1] * cw * 1.1]], -.11 * u, 3, { sw: sw * .4 });
    const ha = Math.atan2(d2[1], d2[0]) + (hand === 'open' ? 0 : s * .35 * clamp(e / 1.2));
    aiHand([Wr[0] + d2[0] * .06 * u, Wr[1] + d2[1] * .06 * u], ha, lh * u, hand, s * (Math.cos(ha) < 0 ? 1 : -1), G === AI_FORM.chibi);
  }
  return Wr;
}

// The whale tail: one tapered ribbon with a paler underside, ending in two flukes. sway in rad (follows down the tail).
function aiTail(G, view, sway) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw;
  const mir = view === 'q' || view === 'side' ? -1 : 1, base = view === 'side' ? [-.5, .1] : view === 'q' ? [.2, 0] : [0, 0];
  const R0 = [G.tail[0][0] * mir + base[0], G.tail[0][1]];
  const pts = G.tail.map(([a, b], i) => { const p = [(a * mir + base[0]) * u, (b + (i ? base[1] * (i / 4) : 0)) * u]; return aiRot(p, [R0[0] * u, R0[1] * u], mir * sway * Math.pow(i / 4, 1.3)); });
  const E = aiRib(pts, G.tailW.map(w => w * u), 5), m = E.C.length;
  const tip = E.C[m - 1], prev = E.C[m - 4], ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), fl = G.fluke * u;
  const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [tip[0] + (x * c - y * n) * fl, tip[1] + (x * n + y * c) * fl]; };
  // flukes behind the stock of the tail
  const fluke = [F(-.25, 0), F(.05, -.3), F(.35, -.78), [...F(.62, -1.0), 1], F(.5, -.55), F(.42, -.15), [...F(.5, 0), 1], F(.42, .15), F(.5, .55), [...F(.62, 1.0), 1], F(.35, .78), F(.05, .3)];
  aiPaint(aiLoop(fluke, 4), { wash: C.fin, ink: C.ink, sw: sw * .65, br: C.brS });
  aiPaint(aiLoop([F(.1, .05), F(.4, .2), F(.5, .6), [...F(.58, .9), 1], F(.3, .6), F(.05, .25)], 3), { wash: C.finIn, ink: null, op: 200 });
  aiPaint(aiRibPts(E), { wash: C.fin, ink: null });
  const und = E.R.slice(Math.round(m * .1)).concat(E.C.slice(Math.round(m * .1)).map((p, i) => [lerp(p[0], E.R[Math.round(m * .1) + i][0], .25), lerp(p[1], E.R[Math.round(m * .1) + i][1], .25)]).reverse());
  aiPaint(und, { wash: C.finIn, ink: null });
  aiPaint(aiRibPts(E), { ink: C.ink, sw: sw * .65, br: C.brS });
  aiLine(E.L.slice(Math.round(m * .15), Math.round(m * .85)).map((p, i) => [lerp(p[0], E.C[Math.round(m * .15) + i][0], .3), lerp(p[1], E.C[Math.round(m * .15) + i][1], .3)]), sw * .35, mixCol(C.fin, C.finIn, .55));
  for (const sd of [-1, 1]) aiLine([F(.1, sd * .12), F(.3, sd * .45), F(.45, sd * .75)], sw * .28, mixCol(C.fin, C.finIn, .4));
  for (let i = 0; i < 3; i++) { const j = Math.round(m * (.3 + i * .18)); aiLine([E.C[j], [lerp(E.C[j][0], E.R[j][0], .7), lerp(E.C[j][1], E.R[j][1], .7)]], sw * .3, mixCol(C.fin, C.finIn, .4)); }
}

// Legs: stockings and Mary-Jane shoes. swing[s] rotates each leg at the hip (rad); dangling while she hovers.
function aiLegs(G, B, view, swing) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [lx, top, knee, ank, w, shoe] = G.leg;
  const order = view === 'q' ? [1, -1] : [-1, 1];
  for (const s of order) {
    const far = view === "q" && s > 0;
    const hx = view === 'side' ? (s < 0 ? -.05 : .1) * u : B(s * lx), hp = [hx, top * u];
    const rot = p => aiRot(p, hp, (swing[s < 0 ? 0 : 1] || 0));
    const Kn = rot([hx + (view === 'side' ? .02 : 0) * u, knee * u]), An = rot([hx + (view === 'side' ? 0 : s * -.02) * u, ank * u]);
    const Ca = [lerp(Kn[0], An[0], .35), lerp(Kn[1], An[1], .35)];
    const R = aiRib([hp, Kn, Ca, An], [w * u, w * .8 * u, w * .88 * u, w * .55 * u], 5);
    aiPaint(aiRibPts(R), { wash: far ? C.stockSh : C.stock, ink: C.ink, sw: sw * .55, br: C.brS });
    aiLine(R.R.slice(Math.round(R.R.length * .3)), sw * .35, C.stockSh);
    // shoe: points along the foot direction (front: down and a little out; 3/4 and profile: toward screen-right)
    const ang = (view === 'front' ? Math.PI / 2 - s * .35 : .25) + (swing[s < 0 ? 0 : 1] || 0) * 1.4, L = shoe * u;
    const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [An[0] + (x * c - y * n) * L, An[1] + (x * n + y * c) * L]; };
    const fr = view === 'front';
    const sh = fr ? [F(-.12, -.42), F(.35, -.48), F(.78, -.38), F(.95, 0), F(.78, .38), F(.35, .48), F(-.12, .42)]
                  : [F(-.25, -.3), F(.2, -.34), F(.7, -.32), F(1.02, -.12), F(1.02, .14), F(.6, .26), F(-.1, .3), F(-.3, .18)];
    aiPaint(aiLoop(sh, 4), { wash: far ? mixCol(C.shoe, C.ink, .3) : C.shoe, ink: C.ink, sw: sw * .6 });
    aiLine(fr ? [F(.15, -.4), F(.22, 0), F(.15, .4)] : [F(.05, -.3), F(.15, .0), F(.1, .26)], sw * .45, C.gold);
    aiLine(fr ? [F(.6, -.25), F(.72, .05)] : [F(.6, -.22), F(.9, -.12)], sw * .4, C.shoeHi);
    if (u > 25) { const bk = fr ? F(.2, s * .22) : F(.12, -.08); aiPaint(aiEll(bk[0], bk[1], .045 * u, .04 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .25 }); }
    aiLine(fr ? [F(.82, -.32), F(.95, 0), F(.82, .32)] : [F(-.2, .22), F(.4, .27), F(.95, .16)], sw * .3, mixCol(C.shoe, C.ink, .5));
  }
}

// Skirt with folds, shading and the gold embroidery band; the petticoat frill peeks out under the hem.
function aiSkirt(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [ty, tw, hy, hw] = G.skirt, n = 12;
  const hem = []; for (let i = 0; i <= n; i++) { const f = i / n; hem.push([lerp(-hw, hw, f), hy + .12 * Math.sin(f * Math.PI) + .045 * Math.sin(f * Math.PI * 9)]); }
  aiFrill(hem.map(([a, b]) => P(a * 1.01, b - .05)), G.petti * u, 15, { shade: true, double: true });
  const sk = [[-tw, ty], [-tw - .2, ty + .75], [-lerp(tw, hw, .5) - .1, lerp(ty, hy, .5)], [-hw + .04, hy - .6], [hem[0][0], hem[0][1], 1], ...hem.slice(1, -1), [hem[n][0], hem[n][1], 1], [hw - .04, hy - .6], [lerp(tw, hw, .5) + .1, lerp(ty, hy, .5)], [tw + .2, ty + .75], [tw, ty]];
  aiPaint(aiLoop(sk.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 4), { wash: C.navy, ink: C.ink, sw: sw * .85, br: C.brS });
  // shadow side (light from the upper left), folds, a dry highlight
  aiPaint(aiLoop([[tw * .5, ty + .1], [tw + .17, ty + .75], [lerp(tw, hw, .5) + .07, lerp(ty, hy, .5)], [hw - .07, hy - .6], [hw - .04, hy + .02, 1], [hw * .6, hy + .1, 1], [hw * .46, lerp(ty, hy, .62)], [tw * .55, ty + 1.3]].map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 3), { wash: C.navySh, op: 190, ink: null, hatch: u > 30 ? aiHatch(C.hatch, .95) : null });
  for (const [f, y0] of [[.08, .35], [.2, .7], [.33, .25], [.47, .55], [.6, .3], [.73, .62], [.86, .4]]) aiLine([P(lerp(-tw, tw, f) * 1.15, lerp(ty, hy, y0 * .45)), P(lerp(-hw, hw, f) * .92, lerp(ty, hy, .55 + y0 * .2)), P(lerp(-hw, hw, f) * .99, hy + .06)], sw * (.3 + .15 * (f > .5)), f > .5 ? C.ink : C.navySh);
  aiLine([P(-tw - .16, ty + .8), P(-lerp(tw, hw, .5) - .05, lerp(ty, hy, .5)), P(-hw + .1, hy - .4)], sw * .4, C.navyHi);
  aiPaint(aiLoop([[-tw - .05, ty + .5], [-tw - .14, ty + .9], [-lerp(tw, hw, .5) - .02, lerp(ty, hy, .5)], [-hw * .9, hy - .3], [-hw * .78, hy - .35], [-lerp(tw, hw, .5) + .14, lerp(ty, hy, .5)], [-tw + .05, ty + .9]].map(p => P(p[0], p[1])), 3), { wash: C.navyHi, op: 110, ink: null });
  // the pinstriped blue underskirt panel showing at the front opening, and two small ribbons (as in the reference)
  { const pw0 = tw * .55, pw1 = hw * .46, py0 = ty + 1.2, py1 = hy + .08;
    aiPaint(aiLoop([[-pw0, py0], [pw0, py0], [pw1, py1], [-pw1, py1]].map(p => P(p[0], p[1])), 2), { wash: C.panel, ink: C.ink, sw: sw * .45, br: C.br });
    if (u > 20) for (let k = -5; k <= 5; k++) aiLine([P(k / 5.5 * pw0, py0 + .1), P(k / 5.5 * pw1, py1 - .1)], sw * .22, mixCol(C.panel, C.cream, .45));
    for (const sd of [-1, 1]) { const c = P(sd * pw1 * .98, lerp(py0, py1, .78)), w = .1 * u;
      for (const k of [-1, 1]) aiPaint(aiLoop([[c[0], c[1], 1], [c[0] + k * w * .9, c[1] - w * .55], [c[0] + k * w, c[1] + w * .35], [c[0] + k * w * .2, c[1] + w * .1]], 3), { wash: C.navySh, ink: C.gold, sw: sw * .3 });
      aiPaint(aiEll(c[0], c[1], w * .2, w * .17, 8), { wash: C.gold, ink: null }); } }
  // embroidery: two gold lines along the hem with little leaf scrolls between them
  for (const off of [.2, .34]) aiLine(hem.map(([a, b]) => P(a * .98, b - off)), sw * .38, C.gold);
  const hemY = x => { const j = (x / hw * .5 + .5) * n, a = clamp(Math.floor(j), 0, n), b = clamp(Math.ceil(j), 0, n); return lerp(hem[a][1], hem[b][1], j % 1); };
  const vine = []; for (let i = 0; i <= 36; i++) { const x = lerp(-hw, hw, i / 36) * .97; vine.push(P(x, hemY(x) - .27 + .035 * Math.sin(i * 1.45))); }
  aiLine(vine, sw * .3, C.gold);
  for (let i = 1; i < G.emb * 2; i++) {   // little curls on the vine and gold sprigs above the border
    const x = lerp(-hw, hw, i / (G.emb * 2)) * .97, y = hemY(x) - .27, d = i % 2 ? 1 : -1;
    aiLine([P(x, y), P(x + .05 * d, y - .05), P(x + .1 * d, y - .02), P(x + .07 * d, y + .02)], sw * .26, C.gold);
    if (i % 2 === 0 && u > 25) {   // a curling gold sprig: S-stem, two leaves, a tiny three-dot flower
      const yb = y - .1, k = i % 4 ? 1 : -1;
      aiLine([P(x, yb), P(x + .05 * k, yb - .09), P(x - .01 * k, yb - .17), P(x + .04 * k, yb - .24)], sw * .24, C.gold);
      aiLine([P(x + .03 * k, yb - .08), P(x + .11 * k, yb - .1), P(x + .07 * k, yb - .05)], sw * .22, C.gold);
      aiLine([P(x, yb - .16), P(x - .08 * k, yb - .2), P(x - .05 * k, yb - .14)], sw * .22, C.gold);
      for (const [dx, dy] of [[0, -.29], [.035, -.26], [-.03, -.26]]) aiPaint(aiEll(...P(x + .04 * k + dx, yb + dy), .018 * u, .018 * u, 6), { wash: C.gold, ink: null });
    }
  }
  if (C.glowK) aiLine([P(-tw - .1, ty + .6), P(-lerp(tw, hw, .5) - .06, lerp(ty, hy, .5)), P(-hw + .1, hy - .3)], sw * .6, C.rim);
}

// Bodice, blouse, collar, gold buttons and the frilled apron straps.
function aiTorso(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [nt, nb, nw] = G.neck, sy = G.shY, by = G.bustY, wy = G.waistY;
  aiPaint([P(-nw, nt), P(nw, nt), P(nw * 1.12, nb + .08), P(-nw * 1.12, nb + .08)], { wash: C.skin, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop([P(-nw, nt), P(nw, nt), P(nw * 1.05, nt + .2), P(0, nt + .3), P(-nw * 1.05, nt + .2)], 3), { wash: C.skinSh, ink: null });
  const mw = (G.armW + G.waistW) / 2 + .03, my = (G.armpitY + wy) / 2;
  const bod = [[-.17, nb - .03], [-.46, sy], [-G.shW, sy + .07, 1], [-G.armW, G.armpitY], [-mw, my], [-G.waistW, wy + .03], [G.waistW, wy + .03], [mw, my], [G.armW, G.armpitY], [G.shW, sy + .07, 1], [.46, sy], [.17, nb - .03]];
  aiPaint(aiLoop(bod.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 3), { wash: C.navy, ink: C.ink, sw: sw * .75, br: C.brS });
  aiPaint(aiLoop([[G.armW * .55, G.armpitY + .05], [G.armW, G.armpitY], [mw, my], [G.waistW, wy + .02], [G.waistW * .6, wy], [mw * .7, my]].map(p => P(p[0], p[1])), 3), { wash: C.navySh, op: 170, ink: null, hatch: u > 30 ? aiHatch(C.hatch, 1.1) : null });
  aiLine([P(-G.shW + .08, sy + .14), P(-G.armW + .06, G.armpitY), P(-mw + .07, my), P(-G.waistW + .06, wy - .02)], sw * .38, C.navyHi);
  for (const s of [-1, 1]) aiLine([P(s * .3, by + .02), P(s * .27, (by + wy) / 2), P(s * .3, wy)], sw * .3, C.navySh);
  // blouse
  const bl = [[-.15, nb - .04], [.15, nb - .04], [.33, nb + .26], [.37, by], [0, by + .05], [-.37, by], [-.33, nb + .26]];
  aiPaint(aiLoop(bl.map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  aiPaint(aiLoop([[.16, nb + .12], [.31, nb + .27], [.35, by - .02], [.2, by + .03]].map(p => P(p[0], p[1])), 3), { wash: C.creamSh, op: 110, ink: null });
  aiLine([P(0, nb + .12), P(0, by + .03)], sw * .35, C.creamSh);
  for (const px of [-.24, -.14, .14, .24]) aiLine([P(px, nb + .2), P(px * 1.1, by - .03)], sw * .28, C.creamSh);
  // gold buttons on the corset
  for (const bx of [-.13, .13]) for (const yy of [by + .2, wy - .18]) aiPaint(aiEll(...P(bx, yy), .045 * u, .045 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  // stand collar up the neck, its wings, and a ruffled jabot down the front
  aiPaint(aiLoop([[-nw * 1.15, nb - .16], [0, nb - .12], [nw * 1.15, nb - .16], [nw * 1.25, nb + .06], [0, nb + .1], [-nw * 1.25, nb + .06]].map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
  for (const s of [-1, 1]) aiPaint(aiLoop([[0, nb + .05], [s * .2, nb - .07], [s * .27, nb + .08], [s * .08, nb + .14]].map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
  for (const s of [-1, 1]) aiFrill([P(0, nb + .12), P(s * .02, lerp(nb, by, .5)), P(0, by - .04)], -s * .1 * u, 5, { sw: sw * .4 });
  // frilled straps from the shoulders to the waist
  for (const s of [-1, 1]) {
    const path = [P(s * .43, sy + .02), P(s * .45, (sy + wy) / 2), P(s * .38, wy)];
    aiFrill(path, -s * .13 * u * (view === 'q' && s > 0 ? .7 : 1), 6, { sw: sw * .45 });
  }
}

// Bow tie with a little gem, at the collar.
function aiBowTie(G, P) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, c = P(0, G.neck[1] + .05), z = G.bow * u;
  const B = pts => pts.map(([a, b, k]) => k ? [c[0] + a * z, c[1] + b * z, 1] : [c[0] + a * z, c[1] + b * z]);
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[sd * .04, .05], [sd * .1, .2], [sd * .13, .36, 1], [sd * .18, .3], [sd * .23, .35, 1], [sd * .1, .03]]), 3), { wash: C.navySh, ink: C.ink, sw: sw * .4 });
  for (const sd of [-1, 1]) {
    aiPaint(aiLoop(B([[0, 0, 1], [sd * .1, -.11], [sd * .25, -.12], [sd * .29, .02], [sd * .23, .12], [sd * .08, .07]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .45 });
    aiLine(B([[sd * .07, -.03], [sd * .17, -.08], [sd * .25, -.07]]), sw * .32, C.navyHi);
    aiLine(B([[sd * .08, .03], [sd * .17, .05], [sd * .23, .09]]), sw * .28, C.navySh);
  }
  aiPaint(B([[0, -.08], [.06, 0], [0, .08], [-.06, 0]]), { wash: C.gem, ink: C.ink, sw: sw * .35 });
  if (u > 25) { aiLine(B([[0, -.08], [0, .08]]), sw * .2, mixCol(C.gem, C.ink, .4)); aiLine(B([[-.06, 0], [.06, 0]]), sw * .2, mixCol(C.gem, C.ink, .4)); }
  aiPaint(B([[-.02, -.05], [.012, -.025], [-.015, -.005]]), { wash: '#FFFFFF', op: 220, ink: null });
  if (C.glowK && u > 35) aiGlow(c[0], c[1], .35 * z, C.rim, .8 * C.glowK);
}

// The apron: scalloped frill, waistband, soft shading and a small whale.
function aiApron(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [ty, tw, by, bw, fr] = G.apron, my = lerp(ty, by, .55);
  const Q = pts => pts.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1]));
  aiFrill(Q([[-tw * 1.02, ty + .3], [-bw * .9, my], [-bw * 1.01, by - .35], [-bw * .82, by], [0, by + .07], [bw * .82, by], [bw * 1.01, by - .35], [bw * .9, my], [tw * 1.02, ty + .3]]), fr * u, 16, { shade: true, double: true });
  const body = [[-tw, ty], [tw, ty], [bw * .88, my], [bw, by - .35], [bw * .82, by - .03], [0, by + .05], [-bw * .82, by - .03], [-bw, by - .35], [-bw * .88, my]];
  aiPaint(aiLoop(Q(body), 4), { wash: C.cream, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop(Q([[tw * .35, ty + .12], [tw * .95, ty + .1], [bw * .86, my], [bw * .97, by - .36], [bw * .75, by - .1], [bw * .55, my]]), 3), { wash: C.creamSh, op: 150, ink: null, hatch: u > 30 ? aiHatch(mixCol(C.creamSh, C.ink, .25), .9, 1.2) : null });
  for (const [f, y0] of [[-.62, .2], [-.3, .45], [.02, .15], [.32, .4], [.6, .25]]) aiLine(Q([[f * tw, lerp(ty, by, y0 * .5)], [f * bw * 1.02, lerp(ty, by, .5 + y0 * .2)], [f * bw * 1.08, by - .15]]), sw * .3, C.creamSh);
  // the whale: a generic little sperm-ish whale with a spout
  const wc = P(bw * .3, by - .62), z = G.whale * u * 1.35, W = pts => pts.map(([a, b, k]) => k ? [wc[0] + a * z, wc[1] + b * z, 1] : [wc[0] + a * z, wc[1] + b * z]);
  aiPaint(aiLoop(W([[-.52, .04], [-.48, -.2], [-.25, -.32], [.05, -.3], [.3, -.18], [.44, -.06], [.54, -.22], [.7, -.34, 1], [.64, -.08], [.78, .04, 1], [.52, .04], [.34, .14], [0, .22], [-.36, .2]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .35 });
  aiLine(W([[.05, .05], [.12, .12]]), sw * .25, C.bow);
  aiLine(W([[-.42, .08], [-.1, .13], [.22, .07]]), sw * .3, C.bow);
  aiPaint(aiEll(...W([[-.3, -.07]])[0], .045 * z, .045 * z, 6), { wash: C.cream, ink: null });
  for (const [a, b] of [[[-.32, -.36], [-.42, -.58]], [[-.24, -.37], [-.2, -.6]], [[-.28, -.38], [-.3, -.64]]]) aiLine(W([a, b]), sw * .3, C.bow);
  // waistband
  const wy = G.waistY, ww = G.waistW + .04;
  aiPaint(Q([[-ww, wy - .07], [ww, wy - .07], [ww, wy + .08], [-ww, wy + .08]]), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  if (u > 25) aiLine(Q([[-ww + .03, wy + .045], [ww - .03, wy + .045]]), sw * .22, C.creamSh);
}

// ---------- watercolour helpers ----------
// A watercolour shape: a flat base wash, a translucent darker glaze slightly shrunk and offset (pigment settling),
// a soft pooled edge (a 'marker' stroke just inside the outline), then the ink line. o: { dark, glaze (0..255), ink, sw,
// br, pool (0..1), gran (granulation colour) }.
function aiWC(pts, col, o = {}) {
  const S = AI_S; if (pts.length < 3) return;
  if (o.smooth) pts = aiLoop(pts, o.smooth);
  aiPaint(pts, { wash: col, ink: null });
  const dk = o.dark || mixCol(col, S.P.ink, .35), g = o.glaze ?? 45;
  if (g > 0 && S.u > 12) {
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length;
    const sc = (k, ox, oy) => pts.map(([x, y]) => [cx + (x - cx) * k + ox * S.u, cy + (y - cy) * k + oy * S.u]);
    // a second, shrunken and offset layer of the shadow colour (pigment pooled to the lower right), then a pale lift
    aiPaint(sc(.9, o.gx ?? .04, o.gy ?? .07), { wash: dk, op: g, ink: null, hatch: o.gran && S.u > 25 ? { d: Math.max(4, S.u * .12), a: .7, o: { rand: .8 }, b: 'charcoal', c: mixCol(col, o.gran, .3), w: .16 } : null });
    aiPaint(sc(.55, -(o.gx ?? .04) * 2, -(o.gy ?? .07) * 2), { wash: mixCol(col, '#FFFFFF', .25), op: g * .5, ink: null });
  }
  // wet edge: the pigment that collects at the rim of a drying wash
  if ((o.pool ?? 1) > 0 && S.u > 12) aiLine(pts.concat([pts[0]]), S.sw * 1.3 * (o.pool ?? 1), mixCol(col, dk, .45), 'marker');
  if (o.ink !== null) aiPaint(pts, { ink: o.ink || S.P.ink, sw: o.sw ?? S.sw * .7, br: o.br || S.P.brS });
}

// ---------- the chibi, built on the measured reference (AI_RC) ----------
// Reference-style eye: a big iris set toward the nose, a heavy upper lash that wraps down the outer corner with two
// flicks, light from the upper left. c = centre (u), hw/hh = half size (u), s = outer side (-1 left), e = eye state.
const AI_ET = aiCurve([[-1, -.18], [-.72, -.66], [-.25, -.94], [.35, -.98], [.82, -.8], [1.03, -.4]], 6);
const AI_EB = aiCurve([[-1, -.18], [-.86, .42], [-.5, .88], [0, 1.0], [.45, .97], [.84, .72], [1.0, .2], [1.03, -.4]], 6);
const aiAt = (T0, x) => { if (x <= T0[0][0]) return T0[0][1]; for (let i = 1; i < T0.length; i++) if (x <= T0[i][0]) { const a = T0[i - 1], b = T0[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0] || 1)); } return T0[T0.length - 1][1]; };
function aiEyeR(M, c, hw, hh, s, wk, e) {
  const S = AI_S, P = S.P, sw = S.swF, kind = e.kind || 'normal', big = ['wide', 'perfect', 'heart'].includes(kind);
  const W = hw * wk * (big ? 1.04 : 1), Hh = hh * (big ? 1.06 : 1);
  const X = (x, y) => M([c[0] + s * x * W, c[1] + y * Hh]);
  const map = pts => pts.map(p => X(p[0], p[1]));
  let lid = clamp(e.lid || 0); if (kind === 'soft') lid = Math.max(lid, .3); if (kind === 'sad') lid = Math.max(lid, .2);
  const top0 = x => aiAt(AI_ET, x), bot = x => aiAt(AI_EB, x) * (kind === 'soft' ? .82 : 1), top = x => lerp(top0(x), bot(x) - .06, lid);
  const xs = []; for (let i = 0; i <= 16; i++) xs.push(lerp(-1, 1.03, i / 16));
  if (kind === 'happy') { aiLine(aiCurve(map([[-.9, .35], [-.35, -.35], [.35, -.42], [.95, .1], [1.05, .32]]), 5), sw * 2.2, P.lash); return; }
  if (lid > .86 || kind === 'closed') {
    aiLine(aiCurve(map([[-.95, .18], [-.3, .5], [.4, .48], [.95, .15], [1.1, -.05]]), 5), sw * 2, P.lash);
    for (const k of [.2, .55]) aiLine(map([[k, .52], [k + .06, .72]]), sw * .6, P.lash);
    return;
  }
  aiPaint(map(xs.map(x => [x, top(x)]).concat(xs.slice().reverse().map(x => [x, bot(x)]))), { wash: P.white, ink: null });
  const inEye = (ex, ey, rx, ry, n = 16) => {
    const T0 = [], B0 = [];
    for (let i = 0; i <= n; i++) {
      const x = ex - rx * Math.cos(Math.PI * i / n); if (x < -1 || x > 1.03) continue;
      const d = Math.sqrt(Math.max(0, 1 - Math.pow((x - ex) / rx, 2))), yT = Math.max(ey - ry * d, top(x)), yB = Math.min(ey + ry * d, bot(x));
      if (yT < yB) { T0.push([x, yT]); B0.push([x, yB]); }
    }
    return map(T0.concat(B0.reverse()));
  };
  const lx = clamp(e.lookX || 0, -1, 1) * s * .22, ly = clamp(e.lookY || 0, -1, 1) * .14;
  const ix = -.2 + lx, iy = .12 + ly, rx = .78, ry = 1.02;
  if (kind === 'blank') {
    aiPaint(inEye(ix, iy, rx, ry), { wash: mixCol(P.iris1, P.white, .5), ink: mixCol(P.iris0, P.white, .3), sw: sw * .5 });
  } else {
    aiPaint(inEye(ix, iy, rx, ry), { wash: P.iris0, ink: null });
    aiPaint(inEye(ix, iy + .22, rx * .9, ry * .72), { wash: P.iris1, ink: null });
    aiPaint(inEye(ix, iy + .55, rx * .7, ry * .4), { wash: P.iris2, ink: null });
    aiPaint(inEye(ix, iy + .78, rx * .4, ry * .17), { wash: P.iris3, ink: null, op: 220 });
    const pr = kind === 'perfect' ? .55 : kind === 'wide' ? .8 : 1;
    if (kind === 'heart') aiPaint(map(aiHeartPts(ix, iy + .05, .32)), { wash: P.pupil, ink: null });
    else aiPaint(inEye(ix - .02, iy + .02, rx * .36 * pr, ry * .46 * pr, 12), { wash: P.pupil, ink: null, op: 235 });
    if (kind === 'perfect') aiPaint(inEye(ix, iy, rx * .62, ry * .62), { ink: P.iris3, sw: sw * .35 });
    aiPaint(inEye(ix, iy, rx, ry), { ink: mixCol(P.iris0, P.lash, .5), sw: sw * .45 });
  }
  const sh = []; for (const x of xs) sh.push([x, top(x)]); for (const x of xs.slice().reverse()) sh.push([x, Math.min(bot(x), top(x) + .24)]);
  aiPaint(map(sh), { wash: P.iris0, op: 80, ink: null });
  if (kind !== 'blank') {   // highlights: always upper-left of the iris on screen (mirrored for 'perfect')
    const side = e.mirror ? -1 : s, hx = ix - side * .36, hy = iy - .5;
    if (kind === 'heart') { const hb = 1 + .15 * Math.sin(T * 9); aiPaint(map(aiHeartPts(hx, hy, .26 * hb)), { wash: P.hi, ink: null }); aiPaint(map(aiHeartPts(ix + side * .3, iy + .45, .12)), { wash: '#FFD6E6', ink: null }); }
    else {
      aiPaint(inEye(hx, hy, .23, .2, 12), { wash: P.hi, ink: null });
      aiPaint(inEye(ix + side * .05, iy - .62, .09, .08, 8), { wash: P.hi, ink: null });
      aiPaint(inEye(ix + side * .3, iy + .5, .07, .05, 6), { wash: P.hi, ink: null, op: 200 });
    }
  }
  if (kind === 'sad') {
    const tp = X(.85, bot(.85) + .1), r = Hh * .25, ph = frac(T * .5 + (s > 0 ? .5 : 0)), dy = ph * 1.5 * Hh;
    aiPaint(aiLoop([[tp[0], tp[1] + dy - 1.5 * r, 1], [tp[0] + .8 * r, tp[1] + dy + .2 * r], [tp[0], tp[1] + dy + .9 * r], [tp[0] - .8 * r, tp[1] + dy + .2 * r]], 4), { wash: '#CBEFFF', ink: P.line, sw: sw * .35 });
  }
  // the heavy upper lash: along the top, then wrapping down the outer side, with two flicks
  const th = x => (.1 + .22 * Math.pow(clamp((x + 1) / 2), 1.1)) * (1 - lid * .3);
  const L1 = [], L2 = [];
  for (const x of xs) { L1.push([x, top(x) - th(x)]); L2.push([x, top(x) + .03]); }
  const wrap = [[1.03, -.4], [1.07, -.1], [1.04, .18], [.98, .38]].map(([x, y]) => [x, lerp(top(Math.min(x, 1.03)), y, 1 - lid)]);
  const wrapIn = [[.96, -.38], [.99, -.1], [.98, .14], [.95, .32]].map(([x, y]) => [x, lerp(top(Math.min(x, 1.03)), y, 1 - lid)]);
  aiPaint(map(L1.concat([[1.18, top(1.03) - .14]], wrap.slice(1), [[.95, .4]], wrapIn.slice().reverse(), L2.slice().reverse())), { wash: P.lash, ink: P.lash, sw: sw * .3 });
  for (const [x0, len] of [[.5, .22], [.78, .26]]) { const y0 = top(x0) - th(x0) + .02; aiPaint(map([[x0 - .08, y0], [x0 + .1 + len * .4, y0 - len, 1], [x0 + .12, y0 + .02]]), { wash: P.lash, ink: null }); }
  const lo = []; for (const x of xs) if (x > -.2 && x < .82) lo.push([x, bot(x) + .02]);
  aiLine(map(lo), sw * .4, mixCol(P.lash, P.skinSh, .45));
}

// The chibi's mouth at m (u), scale z (u per reference mouth width).
function aiMouthR(M, m, z, kind) {
  const S = AI_S, P = S.P, sw = S.swF, R = AI_RC;
  const ref = R.mouth, rc = [0, -5.18];   // the open mouth's centre in the data
  const Q = (pts, sx = 1, sy = 1) => pts.map(([x, y]) => M([m[0] + (x - rc[0]) * sx * z, m[1] + (y - rc[1]) * sy * z]));
  const L = (pts, k = 1) => aiLine(aiCurve(pts.map(([x, y]) => M([m[0] + x * z, m[1] + y * z])), 4), sw * .8 * k, P.ink);
  const open = (sx, sy, tongue = true) => {
    aiPaint(aiLoop(Q(ref, sx, sy), 3), { wash: P.mouth, ink: P.ink, sw: sw * .6 });
    if (tongue) aiPaint(aiLoop(Q(R.tongue, sx, sy), 3), { wash: P.tongue, ink: null });
    aiLine(Q([ref[0], ref[2], ref[4]], sx, sy), sw * .4, mixCol(P.mouth, P.ink, .4));
  };
  switch (kind || 'smile') {
    case 'open': case 'A': open(1, kind === 'A' ? 1.2 : 1); break;
    case 'O': open(.55, 1.25); break;
    case 'E': open(1.1, .6, false); break;
    case 'I': open(1.15, .4, false); aiPaint(Q([[-.15, -5.22], [.15, -5.22], [.13, -5.19], [-.13, -5.19]], 1, 1), { wash: P.teeth || P.white, ink: null }); break;
    case 'U': open(.42, .55, false); break;
    case 'smile': L([[-.2, -.04], [-.08, .04], [.08, .04], [.2, -.04]]); break;
    case 'cat': L([[-.22, -.02], [-.11, .05], [0, -.01], [.11, .05], [.22, -.02]], .9); break;
    case 'frown': L([[-.18, .06], [0, -.02], [.18, .06]]); break;
    case 'flat': L([[-.12, .02], [.12, .02]], .8); break;
    case 'wobble': L([[-.2, .03], [-.1, -.02], [0, .03], [.1, -.02], [.2, .03]], .8); break;
    case 'perfect': {
      const C = [[-.42, -.12, 1], [-.2, .03], [0, .08], [.2, .03], [.42, -.12, 1], [.2, .13], [0, .17], [-.2, .13]];
      aiPaint(aiLoop(C.map(([x, y, k]) => { const p = M([m[0] + x * z, m[1] + y * z]); return k ? [p[0], p[1], 1] : p; }), 4), { wash: P.teeth || P.white, ink: P.ink, sw: sw * .55 });
      for (let i = -3; i <= 3; i++) L([[i * .1, .05 - .03 * Math.abs(i) / 3], [i * .1, .14 - .05 * Math.abs(i) / 3]], .35);
      break;
    }
  }
}

function aiChibi(o, view, A, tt) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, R = AI_RC, rs = A.rs, q = view === 'q';
  const neck = R.p.neck, tilt = (o.tilt || 0) + (q ? -.04 : 0);
  // the body in the turned view (u in, u out): q turns her toward screen-right
  const bodyX = x => q ? .16 + x * (x < 0 ? 1 : .8) : x;
  const BB = pts => pts.map(([x, y]) => [bodyX(x) * u, y * u]);
  // the head: head units on the measured reference (cranium 2.545u, centre 7.19u up), turned by the view's yaw
  const KH = 2.545, HY = -7.19, hdx = (o.headDx || 0) + (q ? .12 : 0), hv = o.headDy || 0;
  const hpt = (a, b, tl) => { const r = aiRot([a * KH + hdx, HY + b * KH + hv], neck, tl); return [r[0] * u, r[1] * u]; };
  const H = (a, b) => hpt(a, b, tilt), hd = aiHD(H, (a, b) => hpt(a, b, tilt * aiHangW(b)), 'chibi', view, A, KH * u);
  // the measured head pieces (frill, band, bow, fins, ahoge; reference u) through the same yaw (they sit near the ear
  // plane: z from a small sphere of radius zr)
  const HH = (pts, zr = .5) => pts.map(p => { const a = p[0] / KH, b = (p[1] - HY) / KH, z = Math.sqrt(Math.max(0, zr * zr - a * a - b * b)), h = H(a * hd.c + z * hd.s, b); return p[2] ? [h[0], h[1], 1] : h; });
  // tail (behind everything), swaying from its root
  rs('tail');
  const tr = R.p.tailRoot, ts = (o.tailK ?? 1) * .14 * Math.sin(tt * TAU * .45 + (o.tail || 0)), tm = q ? -1 : 1;
  const TP = pts => pts.map(([x, y]) => { const d = Math.hypot(x - tr[0], y - tr[1]), r = aiRot([x, y], tr, tm * ts * clamp(d / 3)); return [bodyX(tm * (r[0] - tr[0]) + tr[0] * tm) * u, r[1] * u]; });
  const tailPts = TP(R.tail);
  aiWC(aiLoop(tailPts, 2), C.tail, { dark: mixCol(C.tail, C.ink, .35), glaze: 45 });
  rs('hairback'); aiHairBack(hd);
  // the ear-fins (measured shapes): in q the far one only peeks out behind the skull
  const HZ = pts => HH(pts, 0);
  const finsC = which => {
    if (which === 'far') { if (q) { const rt = R.p.finRootR, F = R.finR.map(p => aiRot(p, rt, -A.fin * .2)).map(([x, y]) => [rt[0] - .3 + (x - rt[0]) * .5, y + .15]); aiWC(HZ(aiLoop(F, 3)), mixCol(C.fin, C.ink, .15), { glaze: 30, sw: S.swF * .6 }); } return; }
    for (const [key, root, sd] of [['finL', R.p.finRootL, -1], ['finR', R.p.finRootR, 1]]) {
      if (q && sd > 0) continue;
      const ang = -sd * (A.fin * .22) + (sd < 0 ? A.flap : -A.flap) * .6;
      const F = aiLoop(R[key].map(p => aiRot(p, root, ang)), 3);
      aiWC(HZ(F), C.fin, { dark: C.ink, glaze: 40, sw: S.swF * .7 });
      const ax = R.p[sd < 0 ? 'finAxL' : 'finAxR'].map(p => aiRot(p, root, ang));
      const under = aiClipHalf(F, ax[0], ax[1]);
      if (under.length > 2) {
        aiPaint(HZ(under), { wash: C.finIn, ink: null });
        const a0 = ax[0], a1 = ax[1], n = 5, sc = [];   // scallops along the lower edge
        for (let i = 0; i <= n * 4; i++) { const t = i / (n * 4), bump = Math.abs(Math.sin(t * n * Math.PI)); sc.push([lerp(a0[0], a1[0], t), lerp(a0[1], a1[1], t) + (.12 + .1 * bump) * (1 - Math.pow(Math.abs(t - .5) * 2, 3))]); }
        aiPaint(HZ(sc.concat([[a1[0], a1[1] - .02], [a0[0], a0[1] - .02]].reverse())), { wash: C.finIn, ink: null });
        aiLine(HZ(sc), S.swF * .55, C.ink, C.brS); aiLine(HZ(aiCurve([ax[0], [lerp(ax[0][0], ax[1][0], .5), lerp(ax[0][1], ax[1][1], .5) - .03], ax[1]], 6)), S.swF * .35, mixCol(C.fin, C.finIn, .4)); }
      const top = aiClipHalf(F, ax[1], ax[0]);
      if (top.length > 2 && S.u > 20) aiLine(HZ(aiCurve([ax[0], ax[1]].map(([x, y]) => [x, y - .25]), 4)), S.swF * .3, mixCol(C.fin, C.finIn, .25));
    }
  };
  // body
  const arm = s => { const e = s < 0 ? (o.eL ?? 2.2) : (o.eR ?? 2.2), k = clamp((e - .5) / 1.3); return [(1 - k) * .3 * s, (1 - k) * 1.2]; };
  rs('legs');
  for (const k of ['sockL', 'sockR']) aiPaint(aiLoop(BB(R[k]), 3), { wash: C.stock, ink: C.ink, sw: sw * .5, br: C.br });
  for (const k of ['shoeL', 'shoeR']) aiWC(BB(R[k]), C.shoe, { glaze: 40, smooth: 3 });
  for (const k of ['shoeL', 'shoeR']) { const P0 = BB(R[k]); let cx = 0, cy = 0; P0.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= P0.length; cy /= P0.length; aiPaint(aiEll(cx - .1 * u, cy + .02 * u, .22 * u, .07 * u, 10, -.2), { wash: C.shoeHi, op: 150, ink: null }); }
  for (const b of R.p.buckles) aiPaint(aiEll(bodyX(b[0]) * u, b[1] * u, .06 * u, .06 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  rs('petti');
  aiFrill(aiCurve(BB(R.lines.hem[0]), 4).map(([x, y]) => [x, y - .05 * u]), .38 * u, 16, { shade: true, double: true, sw: sw * .5 });
  rs('skirt');
  aiWC(BB(R.skirt), C.navy, { dark: C.navySh, glaze: 70, gran: C.navySh, sw: sw * .8, smooth: 3 });
  for (const L of R.lines.skirtL.concat(R.lines.skirtR)) aiLine(BB(L), sw * .4, C.navySh);
  for (const L of R.lines.embL.concat(R.lines.embR)) aiLine(aiCurve(BB(L), 4), sw * .35, C.gold);
  for (const p of R.p.sprigs) { const x = bodyX(p[0]) * u, y = p[1] * u, r = .09 * u; aiLine([[x - r, y + r], [x + r, y - r]], sw * .3, C.gold); aiLine([[x - r, y - r], [x + r, y + r]], sw * .3, C.gold); aiPaint(aiEll(x, y, r * .35, r * .35, 6), { wash: C.gold, ink: null }); }
  for (const [p0, sd] of [[R.p.gbowL, -1], [R.p.gbowR, 1]]) {   // the small gold bows on the skirt
    const x = bodyX(p0[0]) * u, y = p0[1] * u, w = p0[2] * u;
    for (const k of [-1, 1]) aiPaint(aiLoop([[x, y, 1], [x + k * w * .9, y - w * .55], [x + k * w, y + w * .3], [x + k * w * .2, y + w * .1]], 3), { wash: C.gold, ink: C.ink, sw: sw * .35 });
    for (const k of [-1, 1]) aiLine([[x, y], [x + k * w * .4, y + w * .9]], sw * .5, C.gold);
    aiPaint(aiEll(x, y, w * .18, w * .15, 8), { wash: mixCol(C.gold, C.ink, .2), ink: null });
  }
  rs('bodice');
  aiPaint(BB(R.bodice), { wash: C.navy, ink: C.ink, sw: sw * .7 });
  aiWC(BB(R.bib), C.cream, { dark: C.creamSh, glaze: 50, sw: sw * .5, br: C.br, smooth: 2 });
  for (const [pts, sd] of [[[[318, 556], [306, 598], [302, 640]], -1], [[[472, 556], [486, 598], [490, 640]], 1]]) aiFrill(BB(pts.map(([x, y]) => [(x - 395) / 78.5, (y - 917) / 78.5])), sd * -.16 * u, 6, { sw: sw * .45 });
  aiPaint(BB(R.corset), { wash: C.navy, ink: C.ink, sw: sw * .6 });
  for (const b of R.p.gold) aiPaint(aiEll(bodyX(b[0]) * u, b[1] * u, .065 * u, .065 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  for (const b of R.p.btns) aiPaint(aiEll(bodyX(b[0]) * u, b[1] * u, .065 * u, .065 * u, 8), { wash: C.ink, ink: null });
  rs('apron');
  { const ed = aiCurve(BB(R.lines.apronEdge[0]), 4);
    aiFrill(ed, .24 * u, 18, { shade: true, sw: sw * .5 });
    aiWC(ed, C.cream, { dark: C.creamSh, glaze: 50, sw: sw * .5, br: C.br });
    for (const fx of [-.6, -.2, .2, .6]) aiLine(BB([[fx * .9, -2.95], [fx * 1.05, -1.9]]), sw * .3, C.creamSh); }
  aiPaint(aiLoop(BB(R.whale), 2), { wash: C.navy, ink: C.ink, sw: sw * .35, br: C.br });
  { const sp = R.p.spout, x = bodyX(sp[0]) * u, y = sp[1] * u; for (const k of [-1, 0, 1]) aiLine([[x, y + .08 * u], [x + k * .07 * u, y - .07 * u]], sw * .35, C.navy);
    const we = R.p.whaleEye; aiPaint(aiEll(bodyX(we[0]) * u, we[1] * u, .03 * u, .03 * u, 6), { wash: C.cream, ink: null }); }
  rs('collar');
  aiPaint(BB(R.neck), { wash: C.skinSh, ink: null });
  for (const k of ['collarL', 'collarR']) aiPaint(aiLoop(BB(R[k]), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
  aiWC(BB(R.bowtie), C.navy, { glaze: 40, sw: sw * .5, smooth: 2 });
  { const g = R.p.gem, x = bodyX(g[0]) * u, y = g[1] * u, r = g[2] * u; aiPaint([[x, y - r], [x + r * .8, y], [x, y + r], [x - r * .8, y]], { wash: C.gem, ink: C.ink, sw: sw * .3 }); aiPaint([[x - r * .3, y - r * .5], [x + r * .1, y - r * .3], [x - r * .2, y]], { wash: '#FFFFFF', op: 200, ink: null }); }
  rs('arms');
  for (const [pk, ck, hk, s] of [['puffL', 'cuffL', 'handL', -1], ['puffR', 'cuffR', 'handR', 1]]) {
    const [dx, dy] = arm(s), pf = R.p[pk], cf = R.p[ck];
    if (!(q && s > 0)) {
      const px = bodyX(pf[0]) * u, py = pf[1] * u;
      aiWC(aiEll(px, py, pf[2] * u, pf[3] * u, 22, s * .35), C.navy, { glaze: 45, sw: sw * .7 });
      aiPaint(aiEll(px - s * .1 * u, py - .12 * u, pf[2] * u * .5, pf[3] * u * .35, 12, s * .35), { wash: C.navyHi, op: 140, ink: null });
      for (const k of [-.4, .1, .5]) aiLine([[px + k * pf[2] * u, py + pf[3] * u * .8], [px + k * pf[2] * u * .7, py + pf[3] * u * .2]], sw * .3, C.navySh);
    }
    const cx = bodyX(cf[0] + dx) * u, cy = (cf[1] + dy) * u, wq = q && s > 0 ? .75 : 1;
    if (Math.hypot(dx, dy) > .1) aiPaint(aiRib([[bodyX(pf[0]) * u, pf[1] * u], [cx, cy]], [pf[3] * u * 1.4, cf[3] * u * 1.5], 4).L.length ? aiRibPts(aiRib([[bodyX(pf[0]) * u, pf[1] * u], [(bodyX(pf[0]) * u + cx) / 2, (pf[1] * u + cy) / 2], [cx, cy]], [pf[3] * u * 1.3, cf[3] * u * 1.4, cf[3] * u * 1.5], 4)) : [], { wash: C.navy, ink: C.ink, sw: sw * .6 });
    aiPaint(aiEll(cx, cy, cf[2] * u * wq, cf[3] * u, 22), { wash: mixCol(C.navy, C.ink, .15), ink: C.ink, sw: sw * .55 });
    aiPaint(aiEll(cx, cy, cf[2] * u * .84 * wq, cf[3] * u * .84, 20), { ink: C.gold, sw: sw * .35 });
    aiWC(BB(R[hk].map(([x, y]) => [x + dx, y + dy])), C.skin, { dark: C.skinSh, glaze: 50, sw: sw * .45, br: C.br, smooth: 2 });
  }
  // the head (skull, face, fins, front locks, bangs), then the measured headdress pieces
  hd.onBand = () => {   // the ahoge and the headdress: over the bangs, under the face-framing locks
    rs('ahoge');
    { const base = R.p.ahogeBase, ang = A.ahoge * .8; aiWC(HH(R.ahoge.map(p => aiRot(p, base, ang * clamp(Math.hypot(p[0] - base[0], p[1] - base[1]) / 1.5)))), C.hair1, { glaze: 40, sw: sw * .7 }); }
    rs('frill');
    const fr = aiLoop(HH(R.frill), 2);
    aiWC(fr, C.cream, { dark: C.creamSh, glaze: 70, sw: sw * .85 });
    const band = aiCurve(HH(R.lines.band[0]), 6), bn = band.length;
    { let cx = 0, cy = 0; band.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= bn; cy = cy / bn + .9 * u;   // ruffle folds radiating from the band
      for (let i = 2; i < bn - 2; i += 3) { const p = band[i], dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1, L0 = (.2 + .28 * hash(i)) * u;
        aiLine([[p[0] + dx / d * .12 * u, p[1] + dy / d * .12 * u], [p[0] + dx / d * (.12 * u + L0), p[1] + dy / d * (.12 * u + L0)]], sw * .32, C.creamSh); } }
    const bandR = aiRib(R.lines.band[0], [.16, .18, .18, .18, .16].flatMap(v => [v, v, v]).slice(0, R.lines.band[0].length), 5);
    aiPaint(HH(aiRibPts(bandR)), { wash: C.cream, ink: C.ink, sw: sw * .45, br: C.br });
  };
  aiHeadFront(hd, finsC);
  rs('bow');
  { const bc = R.p.bowC, z = bc[2], c0 = HH([bc])[0];
    const B = pts => pts.map(([x, y, k]) => { const p = HH([[bc[0] + x * z, bc[1] + y * z]])[0]; return k ? [p[0], p[1], 1] : p; });
    for (const sd of [-1, 1]) aiWC(aiLoop(B([[0, 0, 1], [sd * .25, -.55], [sd * .75, -.68], [sd * 1.02, -.22], [sd * .88, .3], [sd * .3, .26]]), 4), C.bow, { dark: C.bowSh, glaze: 60, sw: S.swF * .55, br: C.br });
    for (const sd of [-1, 1]) aiPaint(aiLoop(B([[sd * .08, .1], [sd * .25, .5], [sd * .3, .85, 1], [sd * .45, .7], [sd * .55, .82, 1], [sd * .22, .08]]), 3), { wash: C.bowSh, ink: C.ink, sw: S.swF * .45, br: C.br });
    aiPaint(aiLoop(B([[-.16, -.14], [.16, -.14], [.18, .16], [-.18, .16]]), 3), { wash: C.bowSh, ink: C.ink, sw: S.swF * .45, br: C.br });
    for (const sd of [-1, 1]) aiLine(B([[sd * .25, -.08], [sd * .6, -.25]]), S.swF * .35, C.bowSh); }
  return H;
}

// ---------- the full form in the reference pose (pose: 'curtsy') ----------
// Landmarks read off docs/reference/ai_character_reference_full.png, in REFERENCE PIXELS (converted with aiRF below).
// One hand lifts the skirt, the other is raised by the shoulder, the head tilts toward her raised hand.
const AI_RFP = {
  // the skirt: the lifted left half's hem (left to right, running on under the underskirt), both halves, the folds
  skirtL: [[444, 190], [430, 201], [412, 208], [396, 212, 1], [380, 220], [366, 236], [350, 260], [336, 287], [326, 313], [321, 334, 1], [336, 352], [356, 372], [380, 394], [408, 416], [436, 434], [449, 438, 1], [449, 380], [450, 300], [447, 230]],
  hemL: [[321, 334], [336, 352], [356, 372], [380, 394], [408, 416], [436, 434], [466, 448], [500, 458], [540, 462], [574, 457], [592, 447]],
  grip: [392, 218],
  gather: [[[380, 224], [377, 233], [376, 244]], [[396, 226], [394, 236], [395, 246]], [[408, 216], [413, 226], [418, 238]], [[372, 230], [366, 238]]],
  skirtR: [[512, 192], [526, 212], [540, 252], [549, 292], [561, 332], [573, 372], [583, 410], [592, 446, 1], [574, 455], [552, 459], [536, 458, 1], [535, 400], [532, 330], [525, 260], [516, 210]],
  foldsR: [[[530, 250], [541, 330], [552, 440]], [[548, 300], [563, 380], [576, 444]]],
  panel: [[449, 290], [535, 290], [536, 360], [537, 420], [537, 458], [500, 457], [470, 450], [449, 442]],
  panelHem: [[450, 434], [470, 442], [500, 449], [536, 451]],
  trim: [[[446, 300], [447, 370], [447, 436]], [[537, 300], [538, 380], [538, 452]]],
  sprigs: [[338, 336], [358, 357], [382, 379], [408, 400], [478, 438], [500, 441], [522, 442], [566, 440]],
  ribbons: [[446, 400], [538, 412]],
  legL: [[437, 452], [438, 475], [440, 498]], legR: [[478, 462], [481, 488], [484, 512]],
  bodice: [[437, 113], [441, 126], [443, 150], [446, 172], [449, 193], [506, 193], [510, 172], [516, 142], [521, 118], [511, 109], [494, 105], [462, 105], [448, 107]],
  bib: [[452, 106], [470, 104], [490, 106], [508, 110], [515, 125], [515, 145], [511, 158], [490, 163], [470, 163], [450, 158], [444, 140], [446, 120]],
  strapL: [[446, 108], [444, 132], [445, 160], [447, 188]], strapR: [[510, 108], [513, 132], [511, 160], [509, 188]],
  corset: [[446, 159], [470, 165], [490, 164], [511, 157], [508, 188], [449, 188]], gold: [[468, 165], [488, 165], [468, 179], [488, 179]], btns: [[470, 139], [471, 151]],
  neck: [[451, 97], [469, 95], [472, 109], [455, 112]], collar: [[[452, 104], [462, 101], [466, 110], [455, 113]], [[472, 101], [486, 103], [484, 112], [470, 112]]],
  bowtie: [476, 117, 15], waist: [[443, 186], [512, 186], [512, 196], [443, 196]],
  apronEdge: [[452, 196], [448, 230], [449, 280], [459, 314], [478, 330], [500, 335], [520, 328], [536, 310], [541, 270], [538, 222], [530, 196]],
  whale: [497, 293, 8],
  armL: { sh: [436, 128], el: [418, 172], wr: [404, 207] }, armR: { sh: [517, 124], el: [530, 180], wr: [546, 154] },
  cuffL: [[[383, 204], [392, 220], [397, 238]], [400, 213]], cuffR: [[[532, 140], [545, 150], [557, 160]], [544, 157]],
  ahoge: [[447, 20], [440, 12], [431, 9], [421, 13], [414, 22], [415, 31], [419, 35]],
  band: [[424, 59], [427, 46], [434, 35], [446, 28], [461, 25], [476, 28], [487, 36], [494, 46], [498, 56]],
  bow: [498, 57, 9], finR: [[492, 61], [503, 63], [514, 69], [524, 76], [528, 80], [519, 83], [508, 83], [498, 80], [490, 74]], finRax: [[494, 75], [526, 80]],
  finL: [[433, 83], [424, 88], [413, 94], [403, 101], [410, 102], [420, 100], [429, 97], [436, 92]], finLax: [[404, 100], [434, 91]],
  tilt: -.34,   // the head's drawn tilt
};
const aiRF = p => [(p[0] - 462) / 52.5, (p[1] - 534) / 52.5];
const aiRFs = v => v / 52.5;

function aiCurtsy(o, A, tt) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, R = AI_RFP, D = AI_RF, rs = A.rs;
  const U = pts => pts.map(p => { const q = aiRF(p); return [q[0] * u, q[1] * u]; });     // ref px -> local px
  const V = pts => pts.map(([x, y]) => [x * u, y * u]);                                // u -> local px
  // head pivot: the neck; o.tilt adds to her drawn tilt
  const neck = aiRF([461, 104]), dt = (o.tilt || 0);
  const HD = p => { const r = aiRot(p, neck, dt); return [r[0] * u, r[1] * u]; };
  const HDU = pts => pts.map(p => HD(aiRF(p)));
  // the head: head units placed on the measured face (its centre, size and drawn tilt R.tilt), the shared head design;
  // the hair sweeps out to the screen-left as in the reference
  const cH = aiRF([454.4, 58.7]), KH = 38 / 52.5, T0 = R.tilt;
  const hpt = (a, b, tl) => { const r = aiRot([a * KH, b * KH], [0, 0], tl); return HD([cH[0] + r[0], cH[1] + r[1]]); };
  const H = (a, b) => hpt(a, b, T0), hd = aiHD(H, (a, b) => hpt(a, b, T0 * aiHangW(b)), 'full', 'front', A, KH * u, { sweepL: -1.05, sweepR: .55, lenL: 6.2, lenR: 5.6, side: 2.7 });
  // ---- back hair (behind everything but the tail) ----
  rs('hairback'); aiHairBack(hd);
  // ---- tail ----
  rs('tail');
  const tr = aiRF([548, 330]), ts = (o.tailK ?? 1) * .12 * Math.sin(tt * TAU * .45 + (o.tail || 0));
  const TP = pts => pts.map(p => { const d = Math.hypot(p[0] - tr[0], p[1] - tr[1]); const r = aiRot(p, tr, -ts * clamp(d / 2)); return [r[0] * u, r[1] * u]; });
  aiWC(aiLoop(TP(D.tail), 2), C.tail, { glaze: 45 });
  // ---- legs ----
  rs('legs');
  for (const [L, sh] of [[R.legL, D.shoeL], [R.legR, D.shoeR]]) {
    const E = aiRib(U(L), [aiRFs(11) * u, aiRFs(9.5) * u, aiRFs(8) * u], 4);
    aiPaint(aiRibPts(E), { wash: C.stock, ink: C.ink, sw: sw * .5, br: C.br });
    aiLine(E.R.slice(2), sw * .3, C.stockSh);
    aiWC(aiLoop(V(sh), 2), C.shoe, { glaze: 40 });
    let cx = 0, cy = 0; const P0 = V(sh); P0.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= P0.length; cy /= P0.length;
    aiLine([[cx - .2 * u, cy - .12 * u], [cx + .05 * u, cy - .18 * u], [cx + .2 * u, cy - .1 * u]], sw * .5, C.stock);
    aiPaint(aiEll(cx + .08 * u, cy - .17 * u, .05 * u, .05 * u, 8), { wash: C.gold, ink: null });
  }
  // ---- petticoat, overskirt, underskirt ----
  // The left half of the overskirt is gathered up in her fist: it drapes from the grip, its hem curving up to the
  // left, folds radiating from the hand, with the dark lining and two tiers of petticoat ruffles showing under it. The
  // front opening shows the pinstriped blue underskirt; the right half hangs straight.
  rs('petti');
  const hem = R.hemL, nh = hem.length - 1;
  const tier = (d0, d1, dx) => hem.map(([x, y], i) => [x - dx * (1 - i / nh), y + lerp(d0, d1, i / nh)]);
  aiFrill(aiCurve(U(tier(17, 7, 6)), 5), aiRFs(15) * u, 18, { shade: true, double: true, sw: sw * .4, flute: false });
  aiFrill(aiCurve(U(tier(5, 0, 2)), 5), aiRFs(12) * u, 24, { shade: true, sw: sw * .4 });
  aiPaint(aiLoop(U(hem.slice(0, 7).concat(hem.slice(0, 7).reverse().map(([x, y], i) => [x - 3 * (i / 6), y + 7 - 4 * (1 - i / 6)]))), 2), { wash: C.navySh, ink: C.ink, sw: sw * .35 });   // the lining
  rs('panel');
  const pn = aiLoop(U(R.panel), 2);
  aiWC(pn, C.panel, { dark: C.panelSh, glaze: 35, sw: sw * .6, br: C.br });
  { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of pn) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const st = Math.max(3, aiRFs(4.5) * u), ya = y0 + (y1 - y0) * .32;   // pinstripes (the apron hides the top)
    for (let x = x0 + st; x < x1 - st * .5; x += st) aiLine([[x, ya], [x + (x - (x0 + x1) / 2) * .04, y1 - (y1 - y0) * .04]], sw * .28, mixCol(C.panel, C.cream, .4));
    for (const [e, f] of [[x0, 1], [x1, -1]]) aiPaint(aiLoop([[e, y0], [e + f * (x1 - x0) * .2, y0], [e + f * (x1 - x0) * .14, y1], [e, y1]], 1), { wash: C.panelSh, op: 120, ink: null }); }
  { const E = aiCurve(U(R.panelHem), 4); aiLine(E, sw * .5, C.gold); aiLine(E.map(([x, y]) => [x, y - aiRFs(3) * u]), sw * .3, C.gold); }
  rs('dress');
  // the right half
  aiWC(aiLoop(U(R.skirtR), 2), C.navy, { dark: C.navySh, glaze: 45, sw: sw * .8 });
  aiPaint(aiLoop(U([[528, 230], [545, 300], [560, 380], [570, 450], [558, 456], [548, 380], [536, 300]]), 2), { wash: C.navyHi, op: 90, ink: null });
  for (const F of R.foldsR) aiLine(aiCurve(U(F), 4), sw * .42, C.navySh);
  // the left half, gathered in her fist
  const skL = aiLoop(U(R.skirtL), 3);
  aiWC(skL, C.navy, { dark: C.navySh, glaze: 50, sw: sw * .85 });
  const G = R.grip;
  for (let i = 0; i < 5; i++) {   // fold valleys fanning out from the grip to the hem
    const h0 = hem[i], h1 = hem[i + 1], m = [lerp(h0[0], h1[0], .55), lerp(h0[1], h1[1], .55)];
    const a = [lerp(G[0], h0[0], .1), lerp(G[1], h0[1], .1)], b = [lerp(G[0], m[0], .2) + 3, lerp(G[1], m[1], .2)];
    aiPaint(aiLoop(U([a, [lerp(a[0], h0[0], .55) + 2, lerp(a[1], h0[1], .55)], [h0[0] + 3, h0[1] - 2], [m[0], m[1] - 3], [lerp(b[0], m[0], .5), lerp(b[1], m[1], .5)], b]), 2), { wash: C.navySh, op: 150, ink: null, hatch: S.u > 30 && i === 1 ? { d: Math.max(4, u * .1), a: .95, o: { rand: .7 }, b: 'charcoal', c: mixCol(C.navySh, C.navy, .4), w: .2 } : null });
  }
  for (let i = 0; i < 5; i++) { const h1 = hem[i + 1]; aiLine(aiCurve(U([[lerp(G[0], h1[0], .14), lerp(G[1], h1[1], .14)], [lerp(G[0], h1[0], .6) + 3, lerp(G[1], h1[1], .6)], [h1[0] + 1, h1[1] - 3]]), 4), sw * .4, C.navyHi); }   // the ridges
  aiPaint(aiLoop(U([[444, 196], [448, 300], [447, 436], [434, 432], [428, 330], [430, 230]]), 2), { wash: C.navySh, op: 170, ink: null });   // the opening's shadow side
  for (const L of R.gather) aiLine(aiCurve(U(L), 3), sw * .4, C.navySh);   // the cloth bunched in her fist
  // gold trim: the hem embroidery band, sprigs, and the opening's edging
  { const E = aiCurve(U(hem.slice(0, 7).map(([x, y]) => [x + 2, y - 8])), 4); aiLine(E, sw * .5, C.gold); aiLine(E.map(([x, y]) => [x + aiRFs(1.5) * u, y - aiRFs(3.5) * u]), sw * .3, C.gold);
    const E2 = aiCurve(U([[537, 450], [560, 451], [588, 440]]), 3); aiLine(E2, sw * .5, C.gold); }
  for (const L of R.trim) aiLine(aiCurve(U(L), 4), sw * .35, C.gold);
  R.sprigs.forEach(([x, y], i) => { const p = U([[x, y]])[0], k = i % 2 ? 1 : -1, r = aiRFs(5) * u;
    aiLine([[p[0], p[1]], [p[0] + k * r * .3, p[1] - r], [p[0] - k * r * .1, p[1] - r * 1.8]], sw * .38, C.gold);
    aiLine([[p[0] + k * r * .2, p[1] - r * .8], [p[0] + k * r, p[1] - r * 1.1]], sw * .34, C.gold); aiLine([[p[0] - k * r * .05, p[1] - r * 1.3], [p[0] - k * r * .8, p[1] - r * 1.5]], sw * .3, C.gold); });
  for (const [x, y] of R.ribbons) {   // the small navy-and-gold bows at the opening
    const c = U([[x, y]])[0], w = aiRFs(8) * u;
    for (const k of [-1, 1]) aiPaint(aiLoop([[c[0], c[1], 1], [c[0] + k * w * .9, c[1] - w * .55], [c[0] + k * w, c[1] + w * .35], [c[0] + k * w * .2, c[1] + w * .1]], 3), { wash: C.navySh, ink: C.gold, sw: sw * .35 });
    for (const k of [-1, 1]) aiLine([[c[0], c[1]], [c[0] + k * w * .35, c[1] + w * 1.1]], sw * .45, C.navySh);
    aiPaint(aiEll(c[0], c[1], w * .2, w * .17, 8), { wash: C.gold, ink: null });
  }
  // ---- torso ----
  rs('torso');
  aiWC(aiLoop(U(R.bodice), 2), C.navy, { glaze: 45, sw: sw * .7 });
  aiPaint(aiLoop(U([[443, 126], [443, 150], [440, 172], [442, 192], [452, 192], [452, 130]]), 2), { wash: C.navySh, op: 150, ink: null });
  aiWC(aiLoop(U(R.bib), 3), C.cream, { dark: C.creamSh, glaze: 45, sw: sw * .45, br: C.br });
  for (const k of [-1, 1]) aiLine(aiCurve(U([[480 + k * 22, 126], [480 + k * 14, 140], [480 + k * 4, 146]]), 4), sw * .3, C.creamSh);
  aiLine(U([[471, 118], [471, 160]]), sw * .3, C.creamSh);
  for (const [k, sd] of [['strapL', -1], ['strapR', 1]]) aiFrill(aiCurve(U(R[k]), 4), sd * -aiRFs(7) * u, 7, { sw: sw * .4 });
  aiPaint(aiLoop(U(R.corset), 2), { wash: C.navy, ink: C.ink, sw: sw * .55 });
  for (const p of U(R.gold)) aiPaint(aiEll(p[0], p[1], aiRFs(2.3) * u, aiRFs(2.3) * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .25 });
  for (const p of U(R.btns)) aiPaint(aiEll(p[0], p[1], aiRFs(2) * u, aiRFs(2) * u, 8), { wash: C.ink, ink: null });
  // ---- apron ----
  rs('apron');
  { const ap = aiLoop(V(D.apron), 2); aiWC(ap, C.cream, { dark: C.creamSh, glaze: 50, sw: sw * .5, br: C.br });
    const ed = aiCurve(U(R.apronEdge), 4); aiFrill(ed.map(([x, y]) => [x, y]), -aiRFs(8) * u, 22, { shade: true, sw: sw * .4, flute: S.u > 40 });
    for (const [a, b] of [[[468, 205], [462, 300]], [[492, 205], [495, 315]], [[515, 205], [525, 300]]]) aiLine(aiCurve(U([a, [(a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2], b]), 4), sw * .3, C.creamSh);
    aiPaint(aiLoop(U(R.waist), 1), { wash: C.cream, ink: C.ink, sw: sw * .45, br: C.br });
    const [wx, wy, wz] = R.whale, wc = U([[wx, wy]])[0], z = aiRFs(wz) * u;
    aiPaint(aiLoop([[-1.1, .1], [-1, -.45], [-.4, -.7], [.3, -.5], [.75, -.15], [1.0, -.5], [1.4, -.75, 1], [1.3, -.15], [1.6, .1, 1], [1.05, .1], [.6, .4], [0, .5], [-.8, .4]].map(([a, b, k]) => k ? [wc[0] + a * z, wc[1] + b * z, 1] : [wc[0] + a * z, wc[1] + b * z]), 3), { wash: C.navy, ink: C.ink, sw: sw * .3, br: C.br });
    for (const k of [-1, 0, 1]) aiLine([[wc[0] - .5 * z, wc[1] - .8 * z], [wc[0] - .5 * z + k * .3 * z, wc[1] - 1.4 * z]], sw * .3, C.navy); }
  // ---- arms ----
  const armPaint = (a, cuff, hand, aE, raise) => {
    const sh = aiRF(a.sh), el0 = aiRF(a.el), wr0 = aiRF(a.wr);
    const el = aiRot(el0, sh, aE), wr = aiRot(aiRot(wr0, sh, aE), el, raise);
    // the forearm, then the puffed upper sleeve over it: gathered at the shoulder, full in the middle, gathered again
    // into the elbow, with gather creases, a lit side and a shadow side
    const lo = aiRib([el, [lerp(el[0], wr[0], .5), lerp(el[1], wr[1], .5)], wr].map(([x, y]) => [x * u, y * u]), [aiRFs(19) * u, aiRFs(17) * u, aiRFs(15) * u], 4);
    aiWC(aiRibPts(lo), C.navy, { glaze: 40, sw: sw * .8 });
    aiLine(lo.L.slice(1, -1).map((p, i) => [lerp(p[0], lo.C[i + 1][0], .3), lerp(p[1], lo.C[i + 1][1], .3)]), sw * .35, C.navyHi);
    const at = f => [lerp(sh[0], el[0], f), lerp(sh[1], el[1], f)], top = [sh[0] + (sh[0] - el[0]) * .08, sh[1] + (sh[1] - el[1]) * .08];
    const up = aiRib([top, at(.3), at(.62), at(1.02)].map(([x, y]) => [x * u, y * u]), [aiRFs(20) * u, aiRFs(37) * u, aiRFs(33) * u, aiRFs(17) * u], 5);
    const pp = aiRibPts(up); aiWC(pp, C.navy, { glaze: 50, sw: sw * .8 });
    const m = up.L.length - 1, side = up.L[0][0] < up.R[0][0] ? up.L : up.R, shd = side === up.L ? up.R : up.L;
    aiPaint(shd.slice(1, m).concat(up.C.slice(1, m).map((p, i) => [lerp(p[0], shd[i + 1][0], .45), lerp(p[1], shd[i + 1][1], .45)]).reverse()), { wash: C.navySh, op: 140, ink: null });
    aiPaint(side.slice(2, m - 2).concat(up.C.slice(2, m - 2).map((p, i) => [lerp(p[0], side[i + 2][0], .5), lerp(p[1], side[i + 2][1], .5)]).reverse()), { wash: C.navyHi, op: 120, ink: null });
    for (const f of [-.55, -.1, .35]) aiLine(up.C.slice(1, m).map((p, i) => { const q = up.L[i + 1], r = up.R[i + 1], g = .5 + f * .5 * Math.sin(Math.PI * (i + 1) / m); return [lerp(q[0], r[0], g), lerp(q[1], r[1], g)]; }), sw * .32, C.navySh);
    aiLine([up.L[m - 1], up.C[m - 1], up.R[m - 1]], sw * .45, C.navySh);
    const d = [wr[0] - el[0], wr[1] - el[1]], dl = Math.hypot(...d) || 1, n = [-d[1] / dl, d[0] / dl], cw = aiRFs(8.5) * u;
    const W = [wr[0] * u, wr[1] * u], c0 = [W[0] - d[0] / dl * aiRFs(5) * u, W[1] - d[1] / dl * aiRFs(5) * u];
    aiPaint([[c0[0] + n[0] * cw, c0[1] + n[1] * cw], [W[0] + n[0] * cw, W[1] + n[1] * cw], [W[0] - n[0] * cw, W[1] - n[1] * cw], [c0[0] - n[0] * cw, c0[1] - n[1] * cw]], { wash: C.navySh, ink: C.gold, sw: sw * .35 });
    aiFrill([[W[0] + n[0] * cw * 1.3, W[1] + n[1] * cw * 1.3], W, [W[0] - n[0] * cw * 1.3, W[1] - n[1] * cw * 1.3]], aiRFs(10) * u * (raise ? -1 : 1), 5, { sw: sw * .4, double: true });
    const off = [W[0] - aiRF(cuff[1])[0] * u, W[1] - aiRF(cuff[1])[1] * u];
    aiWC(aiLoop(V(hand).map(([x, y]) => [x + off[0], y + off[1]]), 2), C.skin, { dark: C.skinSh, glaze: 50, sw: sw * .4, br: C.br });
  };
  rs('armL'); armPaint(R.armL, R.cuffL, D.handL, o.aL ?? 0, 0);
  rs('armR'); armPaint(R.armR, R.cuffR, D.handR, o.aR ?? 0, o.eR ?? 0);
  // ---- neck, collar, bow tie ----
  rs('neck');
  aiPaint(aiLoop(HDU(R.neck), 2), { wash: C.skin, ink: C.ink, sw: sw * .45, br: C.br });
  aiPaint(aiLoop(HDU([[452, 102], [470, 100], [471, 106], [455, 109]]), 2), { wash: C.skinSh, ink: null });
  for (const cl of R.collar) aiPaint(aiLoop(U(cl), 2), { wash: C.cream, ink: C.ink, sw: sw * .4, br: C.br });
  { const [bx, by, bz] = R.bowtie, c = U([[bx, by]])[0], z = aiRFs(bz) * u;
    for (const k of [-1, 1]) aiPaint(aiLoop([[c[0], c[1], 1], [c[0] + k * z * .4, c[1] - z * .5], [c[0] + k * z, c[1] - z * .45], [c[0] + k * z * 1.05, c[1] + z * .2], [c[0] + k * z * .5, c[1] + z * .35]], 3), { wash: C.navy, ink: C.ink, sw: sw * .4, br: C.br });
    for (const k of [-1, 1]) aiPaint(aiLoop([[c[0] + k * z * .1, c[1] + z * .2], [c[0] + k * z * .35, c[1] + z * 1.0, 1], [c[0] + k * z * .55, c[1] + z * .85, 1]], 2), { wash: C.navySh, ink: C.ink, sw: sw * .35 });
    const r = z * .28; aiPaint([[c[0], c[1] - r], [c[0] + r * .8, c[1]], [c[0], c[1] + r], [c[0] - r * .8, c[1]]], { wash: C.gem, ink: C.ink, sw: sw * .3 }); }
  // ---- head: skull, face, fins, front locks, bangs ----
  aiHeadFront(hd, which => { if (which === 'near') { rs('finL'); aiFinRF(R.finL, R.finLax, HDU, A, -1); rs('finR'); aiFinRF(R.finR, R.finRax, HDU, A, 1); } });
  rs('frill');
  aiFrill(aiCurve(HDU(R.band), 5), -aiRFs(9) * u, 11, { shade: true, sw: sw * .55 });
  aiPaint(aiRibPts(aiRib(HDU(R.band), [aiRFs(3) * u, aiRFs(3.5) * u, aiRFs(3.5) * u, aiRFs(3) * u], 4)), { wash: C.cream, ink: C.ink, sw: sw * .4, br: C.br });
  rs('bow'); { const [bx, by, bz] = R.bow, c = HDU([[bx, by]])[0], z = aiRFs(bz) * u;
    for (const k of [-1, 1]) aiWC(aiLoop([[c[0], c[1], 1], [c[0] + k * z * .3, c[1] - z * .6], [c[0] + k * z * .9, c[1] - z * .55], [c[0] + k * z, c[1] + z * .1], [c[0] + k * z * .4, c[1] + z * .3]], 3), C.bow, { dark: C.bowSh, glaze: 50, sw: sw * .4, br: C.br });
    aiPaint(aiEll(c[0], c[1], z * .22, z * .2, 8), { wash: C.bowSh, ink: C.ink, sw: sw * .3 }); }
  rs('ahoge'); { const base = aiRF(R.ahoge[0]), wob = A.ahoge * .7;
    aiClump(R.ahoge.map((p, i) => { const q = aiRot(aiRF(p), base, wob * i / 6), r = aiRot(q, neck, dt); return [r[0] * u, r[1] * u]; }), [3, 3.4, 3.2, 2.8, 2.2, 1.6, .5].map(v => aiRFs(v) * u), { bands: [[0, C.hair1], [.6, C.hair2]], strand: false, hi: false, sw: sw * .55 }); }
  return H;
}
// A fin from reference-pixel points with a pale scalloped underside below its axis.
function aiFinRF(pts, ax, HDU, A, sd) {
  const S = AI_S, C = S.P, u = S.u, root = pts[0], ang = -sd * A.fin * .25 + A.flap * .5 * sd;
  const rot = P => P.map(p => { const r = aiRot(aiRF(p), aiRF(root), ang); return [r[0] * 52.5 + 462, r[1] * 52.5 + 534]; });
  const F = aiLoop(HDU(rot(pts)), 3), X = HDU(rot(ax));
  aiWC(F, C.fin, { glaze: 40, sw: S.sw * .6 });
  const a0 = X[0], a1 = X[1], n = 4, sc = [];
  const nx = -(a1[1] - a0[1]), ny = a1[0] - a0[0], nl = Math.hypot(nx, ny) || 1, dir = sd < 0 ? -1 : 1;
  for (let i = 0; i <= n * 4; i++) { const t = i / (n * 4), bump = Math.abs(Math.sin(t * n * Math.PI)), d = (aiRFs(2.5) + aiRFs(2) * bump) * u * (1 - Math.pow(Math.abs(t - .5) * 2, 3)) * dir; sc.push([lerp(a0[0], a1[0], t) + nx / nl * d, lerp(a0[1], a1[1], t) + ny / nl * d]); }
  aiPaint(sc.concat([a1, a0].reverse().reverse()), { wash: C.finIn, ink: null });
  aiLine(sc, S.swF * .5, C.ink, C.brS);
}

// ---------- profile body (full form, view 'side', facing screen-right) ----------
function aiBodySide(G, P, A, part) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw;
  const Q = pts => pts.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1]));
  if (part === 'lower') {
    const hy = G.skirt[2], hem = []; for (let i = 0; i <= 10; i++) { const f = i / 10; hem.push([lerp(-1.48, 1.3, f), hy + .06 * Math.sin(f * Math.PI) + .045 * Math.sin(f * Math.PI * 7)]); }
    aiFrill(Q(hem.map(([a, b]) => [a, b - .05])), G.petti * u, 13, { shade: true });
    const sk = [[-.26, -6.6], [-.55, -5.7], [-1.02, -4.0], [-1.36, -2.3], [hem[0][0], hem[0][1], 1], ...hem.slice(1, -1), [hem[10][0], hem[10][1], 1], [1.16, -2.3], [.78, -4.0], [.4, -5.75], [.26, -6.6]];
    aiPaint(aiLoop(Q(sk), 4), { wash: C.navy, ink: C.ink, sw });
    aiPaint(aiLoop(Q([[-.22, -6.5], [-.52, -5.6], [-1.0, -3.9], [-1.32, -2.3], [-1.42, -1.62, 1], [-.85, -1.58, 1], [-.65, -3.4], [-.32, -5.4]]), 3), { wash: C.navySh, op: 190, ink: null });
    aiPaint(aiLoop(Q([[.2, -6.3], [.38, -5.6], [.74, -3.9], [1.1, -2.3], [.95, -2.4], [.55, -3.9], [.25, -5.6]]), 3), { wash: C.navyHi, op: 110, ink: null });
    for (const f of [.22, .45, .68]) aiLine(Q([[lerp(-.3, .3, f), -5.6], [lerp(-1.0, .78, f), -3.8], [lerp(-1.45, 1.28, f), hy + .04]]), sw * .4, C.navySh);
    for (const off of [.2, .34]) aiLine(Q(hem.map(([a, b]) => [a * .98, b - off])), sw * .38, C.gold);
    for (let i = 1; i < 9; i++) { const x = lerp(-1.38, 1.2, i / 9), y = hy - .27, d = i % 2 ? 1 : -1; aiLine(Q([[x - .07, y + .02 * d], [x, y - .03 * d], [x + .07, y + .02 * d]]), sw * .35, C.gold); }
    // apron edge on the front of the skirt, its frill, and the big bow of the apron ties at the back
    aiFrill(Q([[.7, -4.1], [.84, -3.6], [.9, -3.42]]), -.15 * u, 3, { sw: sw * .45 });
    aiPaint(aiLoop(Q([[.14, -6.6], [.32, -6.6], [.46, -5.7], [.84, -4.0], [.92, -3.45, 1], [.74, -3.48, 1], [.62, -4.2], [.3, -5.6]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .55 });
    aiPaint(aiLoop(Q([[-.28, -6.55], [-.36, -6.3], [-.33, -6.05, 1], [-.24, -6.1, 1], [-.25, -6.5]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
    for (const sd of [-1, 1]) aiPaint(aiLoop(Q([[-.28, -6.6, 1], [-.42, -6.6 - sd * .2], [-.56, -6.6 - sd * .16], [-.52, -6.6 - sd * .02]]), 4), { wash: C.cream, ink: C.ink, sw: sw * .5 });
    aiPaint(aiEll(...P(-.3, -6.6), .06 * u, .06 * u, 8), { wash: C.cream, ink: C.ink, sw: sw * .45 });
    return;
  }
  // torso in profile: back, bust, blouse front, collar, bow tie
  const [nt, nb] = G.neck;
  aiPaint(Q([[-.02, nt], [.14, nt], [.17, nb + .04], [-.1, nb + .04]]), { wash: C.skin, ink: C.ink, sw: sw * .6 });
  aiPaint(Q([[-.02, nt], [.14, nt], [.15, nt + .14], [.02, nt + .3]]), { wash: C.skinSh, ink: null });
  const tor = [[-.18, nb], [-.28, -7.6], [-.26, -7.0], [-.24, -6.58], [.24, -6.58], [.28, -6.95], [.38, -7.3], [.33, -7.62], [.2, -7.95], [.13, nb]];
  aiPaint(aiLoop(Q(tor), 3), { wash: C.navy, ink: C.ink, sw: sw * .85 });
  aiPaint(aiLoop(Q([[.12, nb - .02], [.2, -7.95], [.33, -7.62], [.38, -7.3], [.28, -7.26], [.18, -7.55], [.05, -7.98]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiFrill(Q([[.08, -7.95], [.2, -7.55], [.27, -7.2], [.27, -6.65]]), .1 * u, 5, { sw: sw * .4 });
  aiPaint(aiEll(...P(.0, -6.9), .045 * u, .045 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  aiPaint(Q([[-.27, -6.68], [.28, -6.68], [.28, -6.53], [-.27, -6.53]]), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiPaint(aiLoop(Q([[-.02, nb + .02], [.17, nb - .06], [.2, nb + .06], [.05, nb + .12]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .4 });
  aiPaint(aiLoop(Q([[.14, nb + .02], [.25, nb - .05], [.27, nb + .09], [.15, nb + .08]]), 3), { wash: C.navy, ink: C.ink, sw: sw * .4 });
  aiPaint(Q([[.15, nb], [.19, nb + .04], [.15, nb + .08], [.12, nb + .04]]), { wash: C.gem, ink: C.ink, sw: sw * .3 });
}
// ---------- her ----------
function ai(x, y, u, o = {}) {
  const id = o.boilKey ?? ('n' + (++CLAWD_N)), rs = part => boilSeed(`ai ${id} ${part}`);
  const form = o.form === 'chibi' ? 'chibi' : 'full', G = AI_FORM[form];
  let view = AI_YAW[o.view] !== undefined ? o.view : 'front'; if (form === 'chibi' && view === 'side') view = 'q';
  const base = typeof o.pal === 'object' ? o.pal : AI_PAL[o.pal] || AI_PAL.default;
  const P2 = o.pal2 ? (typeof o.pal2 === 'object' ? o.pal2 : AI_PAL[o.pal2]) : null;
  const pal = P2 ? aiPalMix(base, P2, clamp(o.palK ?? 1)) : base;
  const tt = o.t ?? T, sq = o.sq || 0, fl = o.float ?? .25, bob = o.bob ?? .07 * Math.sin(tt * TAU * .5 + (o.seed || 0));
  const X = x + (o.dx || 0) * u, Y = y + ((o.dy || 0) - fl - bob) * u;
  const sx = (o.flip ? -1 : 1) * (1 + sq * .6), sy = 1 - sq;
  // squash and stretch pivot at her waist (she hovers, so no foot contact to keep)
  const py = -6 * u;
  let clip = null;
  if (o.clip) { const [a, b, c, d] = o.clip, xs = [(a - X) / sx, (c - X) / sx].sort((p, q) => p - q); clip = [xs[0], (b - Y - py) / sy + py, xs[1], (d - Y - py) / sy + py]; }
  const g = clamp(o.glitch || 0), gf = Math.floor(tt * 12);
  const rotA = o.rot || 0, warp = g > 0 ? yy => { const band = Math.floor(yy / (u * .38)) + 300, r = hash(band * 7.13 + gf * 3.31 + 1); return r < g * .6 ? (hash(band * 1.7 + gf * .91) - .5) * 2.2 * g * u : 0; } : null;
  AI_S = { P: pal, u, k: G.k * u, sw: clamp(u / 85, .22, 1.7) * pal.swk, swF: clamp(G.k * u / 75, .22, 1.5) * pal.swk, J: pal.J * u / 60, warp, clip, rot: rotA };
  const eyes = o.eyes || 'normal';
  const bl = ((tt * .85 + (o.seed || 0) * 1.37) % 3.9 + 3.9) % 3.9, autoBlink = bl < .05 ? bl / .05 : bl < .12 ? 1 : bl < .19 ? 1 - (bl - .12) / .07 : 0;
  const A = {
    rs, eye: { kind: eyes, lid: Math.max(o.lid || 0, o.blink || 0, o.blink === undefined && eyes !== 'perfect' ? autoBlink : 0), lookX: o.lookX || 0, lookY: o.lookY || 0, mirror: eyes === 'perfect' },
    mouth: o.mouth || 'smile', brow: o.brow || 0, blush: o.blush ?? .3, fin: o.fin || 0, flap: o.flap ?? .07 * Math.sin(tt * TAU * .6 + 1),
    ahoge: (o.ahoge || 0) + .1 * Math.sin(tt * TAU * .7), sway: (o.hairLag || 0) + .1 * Math.sin(tt * TAU * .3 + 2),
  };
  push(); translate(X, Y + py); scale(sx, sy); translate(0, -py);
  rs('shadow');
  if (!o.noShadow) { const k = 1 / (1 + (fl + bob) * .4), sy0 = (fl + bob) * u; aiPaint(aiEll(0, sy0, 1.55 * u * k * (form === 'chibi' ? 1.1 : 1), .24 * u * k, 20), { wash: pal.shadow, op: 50, ink: null }); }
  if (pal.glowK) { rs('halo'); aiGlow(0, (form === 'chibi' ? -6.2 : -5.6) * u, 6 * u, pal.rim, .4 * pal.glowK); }
  const qc = form === 'chibi' ? .1 : .12;
  const B = xx => (view === 'q' ? qc + xx * (xx < 0 ? 1 : .72) : xx) * u, P = (xx, yy) => [B(xx), yy * u];
  const hcx = view === 'q' ? B(0) - .05 * u : view === 'side' ? -.02 * u : 0, hc = [hcx + (o.headDx || 0) * u, (G.hc[1] + (o.headDy || 0)) * u], k = G.k * u;
  const piv = [hcx, hc[1] + AI_FACE[form].chin * k + .1 * u], tilt = o.tilt || 0;
  let H = (a, b) => aiRot([hc[0] + a * k, hc[1] + b * k], piv, tilt);
  const Hh = (a, b) => aiRot([hc[0] + a * k, hc[1] + b * k], piv, tilt * aiHangW(b));
  const aL = o.aL ?? .06, aR = o.aR ?? .06, eL = o.eL ?? (form === 'chibi' ? 2.2 : 1.05), eR = o.eR ?? (form === 'chibi' ? 2.2 : 1.0), hL = o.handL || 'relax', hR = o.handR || 'relax';
  const swing = [o.legL ?? .05 * Math.sin(tt * TAU * .5), o.legR ?? -.06 * Math.sin(tt * TAU * .5 + .8)];
  const tailSway = (o.tailK ?? 1) * .16 * Math.sin(tt * TAU * .45 + (o.tail || 0));
  if (form === 'chibi') H = aiChibi(o, view, A, tt);
  else if (o.pose === 'curtsy') H = aiCurtsy(o, A, tt);
  else {
  const hd = aiHD(H, Hh, 'full', view, A, k);
  rs('hairback'); aiHairBack(hd);
  rs('tail'); aiTail(G, view, tailSway);
  if (view === 'side') {
    rs('legs'); aiLegs(G, B, 'side', swing);
    rs('skirt'); aiBodySide(G, P, A, 'lower');
    rs('torso'); aiBodySide(G, P, A, 'upper');
    aiHeadFull(hd);
    rs('armR'); aiArm(G, () => 0, 1, aR, eR * .45, hR, 'all', false, true);
  } else {
    if (view === 'q') { rs('armfar'); aiArm(G, B, 1, aR, eR, hR, 'all', true); }
    rs('legs'); aiLegs(G, B, view, swing);
    rs('skirt'); aiSkirt(G, P, view);
    rs('torso'); aiTorso(G, P, view);
    rs('apron'); aiApron(G, P, view);
    rs('bowtie'); aiBowTie(G, P);
    rs('armup'); if (view === 'front') aiArm(G, B, 1, aR, eR, hR, 'upper'); aiArm(G, B, -1, aL, eL, hL, 'upper');
    aiHeadFull(hd);
    rs('armlow'); if (view === 'front') aiArm(G, B, 1, aR, eR, hR, 'lower'); aiArm(G, B, -1, aL, eL, hL, 'lower');
  }
  }
  if (o.draw) { rs('draw'); o.draw(u, H); }
  if (o.emote) { rs('emote'); aiEmote(o.emote, H, o.emoteK ?? 1, o.emoteAge ?? tt); }
  if (g > .02) { rs('glitch'); aiGlitchMarks(g, u, gf); }
  pop();
  AI_S = null;
  rs('after');
}

// Painted glitch marks over her: cyan / magenta scan strokes and a few dropped blocks, re-drawn 12 times a second.
function aiGlitchMarks(g, u, gf) {
  const S = AI_S, n = Math.round(3 + g * 9);
  for (let i = 0; i < n; i++) {
    const r = hash(i * 3.7 + gf * 1.3), yy = -lerp(.5, 10, hash(i * 9.1 + gf * .7)) * u, x0 = (r - .5) * 3 * u, len = (.6 + 2.2 * hash(i + gf * 2.1)) * u;
    if (hash(i * 5.3 + gf) > g + .15) continue;
    aiLine([[x0, yy], [x0 + len, yy]], S.sw * (.7 + 1.4 * g), i % 2 ? '#7FE9FF' : '#FF5FA2', 'inkfine');
    if (i % 2) aiLine([[x0 + len * .2, yy + .05 * u], [x0 + len * .9, yy + .05 * u]], S.sw * .5, '#E8FDFF', 'inkfine');
    if (i % 3 === 0) aiPaint([[x0, yy - .08 * u], [x0 + .3 * u, yy - .08 * u], [x0 + .3 * u, yy + .1 * u], [x0, yy + .1 * u]], { wash: i % 2 ? '#E8FDFF' : '#1B6FFF', op: 200, ink: null });
  }
}

// Painted reaction marks near her head: sweat, hearts, sparkle, note, gloom. k = pop 0..1, age = s since it appeared.
function aiEmote(kind, H, k, age) {
  const S = AI_S, C = S.P, p = backOut(clamp(k)); if (p < .02) return;
  const sw = S.swF * .6, z = .3 * p;
  const at = (a, b) => H(a, b);
  if (kind === 'sweat') {
    const [cx, cy] = at(1.05, -.55 + .05 * Math.sin(age * 3)), r = S.k * z * .7;
    aiPaint(aiLoop([[cx, cy - 1.6 * r, 1], [cx + .9 * r, cy + .2 * r], [cx, cy + .95 * r], [cx - .9 * r, cy + .2 * r]], 4), { wash: '#BFE8FF', ink: C.ink, sw });
    aiPaint(aiEll(cx - .3 * r, cy + .1 * r, .2 * r, .3 * r, 8), { wash: '#FFFFFF', op: 220, ink: null });
  } else if (kind === 'hearts') {
    for (let i = 0; i < 3; i++) {
      const ph = frac(age * .55 + i / 3), a = Math.sin(ph * Math.PI); if (a < .1) continue;
      const [cx, cy] = at(.9 + .35 * i - .1 + .12 * Math.sin(ph * 6 + i), -.7 - ph * 1.1);
      aiPaint(aiHeartPts(cx, cy, S.k * z * (.45 + .4 * a)), { wash: C.heart, ink: C.ink, sw });
    }
  } else if (kind === 'sparkle') {
    for (let i = 0; i < 3; i++) {
      const tw = .7 + .3 * Math.sin(age * 9 + i * 2), [cx, cy] = at([1.1, 1.35, .95][i], [-.75, -.35, -1.15][i]), r = S.k * z * [.5, .32, .28][i] * tw;
      aiPaint(starPts(cx, cy, r, .3, 4), { wash: C.glowK ? '#E8FDFF' : '#FFF4C2', ink: C.ink, sw: sw * .8 });
      if (C.glowK && i === 0 && S.k > 25) aiGlow(cx, cy, r * 2.5, C.rim, .7);
    }
  } else if (kind === 'note') {
    const [cx, cy] = at(1.15, -.7 + .08 * Math.sin(age * 5)), r = S.k * z;
    aiPaint(aiEll(cx, cy + .9 * r, .32 * r, .24 * r, 10, -.4), { wash: C.ink, ink: null });
    aiLine([[cx + .28 * r, cy + .85 * r], [cx + .28 * r, cy - .6 * r], [cx + .75 * r, cy - .3 * r]], sw * 1.2, C.ink);
  } else if (kind === 'gloom') {
    for (let i = 0; i < 4; i++) { const xx = -.45 + i * .3; aiLine([at(xx, -.62), at(xx + .01, -.62 + .35 * p * (.7 + .3 * hash(i)))], sw * .9, C.line); }
  }
}

// ---------- emotions ----------
// Each emotion is a face AND a way of moving, locked to the beat (PROJECT.bpm). body(t) returns pose offsets for ai();
// take = the size of the reaction when she switches INTO it. Arms: aL/aR (upper arm), eL/eR (elbow), handL/handR.
const aiB = t => { const bp = bpOf(t), s1 = Math.sin(bp * Math.PI); return { bp, s1, ab: Math.abs(s1), hit: pulse(t), s2: Math.sin(bp * TAU), f: frac(bp) }; };
const AI_EMO = {
  smile:   { eyes: 'normal', mouth: 'smile', brow: 0, blush: .35, fin: .1, take: .4, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 4); return { tilt: .05 * s, dy: -.12 * b.ab, sq: .015 * b.hit, rot: .01 * s, lookX: .1 * s, ahoge: .1 * s }; } },
  gentle:  { eyes: 'soft', mouth: 'smile', brow: .3, blush: .5, fin: -.15, take: .3, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 8); return { tilt: .13 + .03 * s, dy: -.08 * b.ab, rot: -.015, lookY: .15, aL: .1, eL: 1.9, aR: .12, eR: 2.0, float: .2 }; } },
  eager:   { eyes: 'wide', mouth: 'open', brow: -.5, blush: .6, fin: .75, emote: 'sparkle', take: .9, body: t => { const b = aiB(t), h = Math.abs(b.s2); return { dy: -.45 * h, sq: .05 * pulse2(t) - .03 * h, rot: .025, lookY: -.15, aL: .28, eL: 2.35 + .12 * b.s2, aR: .28, eR: 2.3 - .12 * b.s2, handL: 'fist', handR: 'fist', ahoge: .25 * b.s2, tilt: -.04, float: .35 }; } },
  worried: { eyes: 'normal', lid: .12, mouth: 'wobble', brow: 1, blush: .1, fin: -.55, emote: 'sweat', take: .5, body: t => { const b = aiB(t); return { lookX: beatN(t) % 4 < 2 ? .5 : -.4, tilt: -.06, sq: .04, aL: .15, eL: 2.5, aR: .06, eR: 1.05, handL: 'fist', dx: .05 * Math.sin(t * TAU * 3), float: .2 }; } },
  heart:   { eyes: 'heart', mouth: 'open', brow: -.3, blush: 1, fin: .85, emote: 'hearts', take: 1.1, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 2); return { tilt: .12 * s, rot: .03 * s, dy: -.35 * b.ab, sq: .04 * b.hit, aL: .3, eL: 2.4, aR: .3, eR: 2.4, handL: 'fist', handR: 'fist', ahoge: .3 * s, float: .4 }; } },
  blank:   { eyes: 'blank', mouth: 'flat', brow: 0, blush: 0, fin: -.25, take: .2, body: t => ({ aL: .02, eL: .12, aR: .02, eR: .12, float: .18, bob: .02 * Math.sin(t * .7), lookX: 0, lookY: 0 }) },
  sad:     { eyes: 'sad', mouth: 'frown', brow: 1, blush: .15, fin: -1, emote: 'gloom', take: .35, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 8); return { sq: .05 + .015 * s, lookY: .55, tilt: .06, rot: .015 * s, aL: .02, eL: .75, aR: .02, eR: .7, float: .1, ahoge: -.5, hairLag: -.05 }; } },
  perfect: { eyes: 'perfect', mouth: 'perfect', brow: 0, blush: 0, fin: 0, take: .12, body: t => ({ tilt: 0, rot: 0, lookX: 0, lookY: 0, aL: .06, eL: 1.0, aR: .06, eR: 1.0, bob: 0, float: .3, ahoge: 0, flap: 0, tailK: .3, hairLag: 0 }) },
};
// One emotion alive at time t: face, fins, arms and motion together. Spread it into ai():
//   ai(x, y, u, aiFeel('eager', t))          ai(x, y, u, { ...aiFeel('gentle', t), form: 'chibi', view: 'q' })
function aiFeel(name, t, over = {}) {
  const E = AI_EMO[name] || AI_EMO.smile;
  return { eyes: E.eyes, mouth: E.mouth, brow: E.brow || 0, blush: E.blush || 0, fin: E.fin || 0, lid: E.lid || 0, emote: E.emote, ...(E.body ? E.body(t) : {}), ...over };
}
// An emotion timeline with ACTED changes: keys = [[t0, 'smile'], [t1, 'worried'], [t2, 'eager', { lookX: .5 }]].
// Just before each change she blinks shut and squashes (anticipation); the face swaps under the blink; then a take
// (stretch up, spring back) sized to the new emotion, the pose settles with overshoot, and the new emote pops in.
// o.take scales every take. Spread the result into ai() and add any other pose (add dy / sq if you also move them).
function aiEmotions(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc, cur = aiFeel(name, t, over), E = AI_EMO[name] || AI_EMO.smile;
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tk = o.take ?? 1;
  let blink = 0;
  if (tn - t < .1) blink = Math.max(blink, 1 - (tn - t) / .1);
  if (i > 0 && age < .14) blink = Math.max(blink, 1 - age / .14);
  const prev = i > 0 ? aiFeel(keys[i - 1][1], t, keys[i - 1][2]) : null;
  if (prev && age < .55) {
    const base = { dy: 0, sq: 0, rot: 0, tilt: 0, dx: 0, lookX: 0, lookY: 0, aL: .06, aR: .06, eL: 1.05, eR: 1.0, float: .25, ahoge: 0, brow: 0, fin: 0, blush: 0, lid: 0, hairLag: 0 };
    const k = backOut(seg(age, 0, .42)), kc = ease(seg(age, 0, .3));
    for (const f in base) { const kk = ['brow', 'blush', 'lid'].includes(f) ? kc : k; cur[f] = lerp(prev[f] ?? base[f], cur[f] ?? base[f], kk); }
  }
  // the take this key fires, plus the anticipation squash of the next one (take() from core.js, scaled to her height)
  const t1 = prev ? take(t, tc, (E.take ?? .5) * tk) : { sq: 0, dy: 0 };
  const En = i + 1 < keys.length ? AI_EMO[keys[i + 1][1]] || AI_EMO.smile : null, t2 = En ? take(t, tn, (En.take ?? .5) * tk) : { sq: 0, dy: 0 };
  cur.sq = (cur.sq || 0) + (t1.sq + t2.sq) * .3; cur.dy = (cur.dy || 0) + (t1.dy + t2.dy) * .35;
  cur.fin = (cur.fin || 0) + .5 * spring(t, tc, 7, 20) * (prev ? 1 : 0);
  cur.ahoge = (cur.ahoge || 0) + .6 * spring(t, tc + .05, 5, 16) * (prev ? 1 : 0);
  if (blink > 0) cur.blink = blink;
  const same = prev && prev.emote === cur.emote;
  cur.emoteK = same ? 1 : seg(age, .08, .34);
  cur.emoteAge = age;
  return cur;
}
// Lip flap for talking/singing: cycles visemes on eighth notes between t0 and t1 (seeded so it never repeats evenly).
function aiTalk(t, t0, t1, seed = 0) {
  if (t < t0 || t > t1) return null;
  const n = Math.floor(bpOf(t) * 2), V = ['A', 'I', 'U', 'E', 'O', 'smile', 'A', 'O'];
  return V[Math.floor(hash(n * 1.37 + seed) * V.length)];
}

// ---------- model sheets ----------
// A painted panel (wash + thin ink), for sheets.
function aiPanel(x, y, w, h, col, key) {
  boilSeed('aipanel ' + key);
  paint(rectPts(x, y, w, h, 1.5), { wash: col, ink: '#2B2233', sw: .5, br: 'inkfine' });
}
// ai_sheet: row 1 the key views (chibi front, chibi 3/4, full front, full 3/4, full side), row 2 the expressions as
// bust close-ups, row 3 the palettes (default / glow / amber) and a glitch sample.
let AI_SKIP = null;
LOOPS.ai_sheet = t => {
  const sk = r => AI_SKIP && AI_SKIP.includes(r);
  const lab = (s, x, y, sz = 22) => letter(s, x, y, sz, '#2B2233', { screen: true, ink: false });
  // row 1: chibi front / 3/4 (verse 1), the full form in the reference pose (main), full front / side
  const g1 = 600;
  if (!sk('1')) {
    ai(140, g1 - 4, 25.5, { ...aiFeel('eager', t), form: 'chibi', view: 'front', t, seed: 1 });
    ai(425, g1 - 4, 25.5, { ...aiFeel('smile', t), form: 'chibi', view: 'q', t, seed: 2, lookX: .3, mouth: 'open' });
    ai(790, g1, 57, { ...aiFeel('smile', t), form: 'full', pose: 'curtsy', t, seed: 3, mouth: 'open', blush: .5 });
    ai(1230, g1, 53, { ...aiFeel('smile', t), form: 'full', view: 'front', t, seed: 4 });
    ai(1620, g1, 53, { ...aiFeel('smile', t), form: 'full', view: 'side', t, seed: 5, aR: .15, eR: .4 });
  }
  [['chibi · front', 140], ['chibi · 3/4', 425], ['full · reference pose', 790], ['full · front', 1230], ['full · side', 1620]].forEach(([s, x]) => lab(s, x, g1 + 22));
  // row 2: the eight expressions as chibi close-ups
  const names = ['smile', 'gentle', 'eager', 'worried', 'heart', 'blank', 'sad', 'perfect'], pw = 232, py = 632, ph = 258;
  if (!sk('2')) names.forEach((n, i) => {
    const x0 = 28 + i * (pw + 4);
    aiPanel(x0, py, pw, ph, i % 2 ? '#EEF3F7' : '#F4F1EA', 'e' + i);
    const u = 50, cx = x0 + pw / 2, f = aiFeel(n, t);
    ai(cx, py + ph * .44 + 5.95 * u, u, { ...f, form: 'chibi', view: 'front', t, seed: i, clip: [x0 + 2, py + 2, x0 + pw - 2, py + ph - 2], noShadow: true, bob: 0, dy: 0, sq: 0, rot: 0, float: 0 });
    lab(n, cx, py + ph + 14, 20);
  });
  // row 3: palettes and the glitch
  const ry = 918, rh = 156;
  if (sk('3')) return;
  [['default', '#F4F1EA'], ['glow', '#14193F'], ['amber', '#F6E7D2']].forEach(([pal, bg], i) => {
    const x0 = 28 + i * 470;
    aiPanel(x0, ry, 462, rh, bg, 'p' + i);
    ai(x0 + 70, ry + rh - 8, 14.5, { ...aiFeel(i === 1 ? 'eager' : 'smile', t), form: 'chibi', pal, t, seed: 10 + i, noShadow: true, clip: [x0, ry, x0 + 462, ry + rh] });
    ai(x0 + 175, ry + rh - 6, 14.5, { ...aiFeel(i === 2 ? 'gentle' : 'smile', t), form: 'full', pose: 'curtsy', pal, t, seed: 20 + i, noShadow: true, clip: [x0, ry, x0 + 462, ry + rh] });
    const P = AI_PAL[pal], sw = [P.hair0, P.hair2, P.hair4, P.iris1, P.navy, P.cream, P.skin, P.gold];
    sw.forEach((c, j) => { boilSeed('swatch' + i + j); paint(ellPts(x0 + 262 + (j % 4) * 48, ry + 52 + Math.floor(j / 4) * 50, 19, 17, 14, 1), { wash: c, ink: '#2B2233', sw: .4, br: 'inkfine' }); });
    letter(pal, x0 + 360, ry + rh - 18, 20, i === 1 ? '#E8FDFF' : '#2B2233', { screen: true, ink: false });
  });
  const gx = 28 + 3 * 470;
  aiPanel(gx, ry, 452, rh, '#0E1330', 'pg');
  const gk = .35 + .3 * Math.sin(t * 2.1) ** 2;
  ai(gx + 110, ry + rh - 6, 14.5, { ...aiFeel('blank', t), form: 'full', pose: 'curtsy', pal: 'glow', t, glitch: gk + .2, noShadow: true, clip: [gx, ry, gx + 452, ry + rh] });
  ai(gx + 260, ry + rh - 8, 14.5, { ...aiFeel('perfect', t), form: 'chibi', pal: 'glow', t, glitch: gk, noShadow: true, clip: [gx, ry, gx + 452, ry + rh] });
  letter('glitch', gx + 380, ry + rh - 18, 20, '#E8FDFF', { screen: true, ink: false });
};
LOOPS.ai_sheet.len = 4;

// ai_emotions: the eight emotions as an acted sequence (aiEmotions), on the full form, the chibi and a close-up.
const AI_EMO_KEYS = [[0, 'smile'], [.75, 'gentle'], [1.5, 'eager'], [2.25, 'worried'], [3.0, 'heart'], [3.75, 'blank'], [4.5, 'sad'], [5.25, 'perfect']];
LOOPS.ai_emotions = t => {
  const m = aiEmotions(t, AI_EMO_KEYS);
  boilSeed('ai_emo bg');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#EEF2F2', ink: null });
  ai(300, 1050, 92, { ...m, form: 'full', pose: 'curtsy', t, seed: 1 });
  ai(760, 1040, 34, { ...m, form: 'chibi', view: 'q', t, seed: 2 });
  aiPanel(1010, 40, 880, 1000, '#F4F1EA', 'emo');
  const u = 120;
  ai(1450, 40 + 2.6 * u + 10 * u - .5 * u, u, { ...m, form: 'chibi', view: 'front', t, seed: 3, clip: [1012, 42, 1888, 1038], noShadow: true, float: 0 });
};
LOOPS.ai_emotions.len = 6;

// ai_faces: four big busts, for working on the face.
LOOPS.ai_faces = t => {
  const names = (window.AI_FACES || 'smile,eager,heart,perfect').split(',');
  names.forEach((n, i) => {
    const x0 = 10 + i * 477, f = aiFeel(n, t), u = 210;
    aiPanel(x0, 10, 467, 1060, '#F4F1EA', 'f' + i);
    ai(x0 + 233, 330 + 9.28 * u + (f.float ?? .25) * u, u, { ...f, form: i === 3 && window.AI_FACES_CHIBI ? 'chibi' : 'full', view: window.AI_FACES_VIEW || 'front', t, seed: i, clip: [x0 + 2, 12, x0 + 465, 1068], noShadow: true, bob: 0, dy: 0, sq: 0 });
  });
};
LOOPS.ai_faces.len = 2;

// ai_cmp_chibi: the chibi at the reference's scale and position (reference px + (960, 100)), for the comparison sheet.
LOOPS.ai_cmp_chibi = t => {
  ai(960 + 395, 100 + 917, 78.5, { form: 'chibi', t, mouth: 'open', blush: .5, float: 0, bob: 0, noShadow: true, blink: 0, seed: 3 });
};
LOOPS.ai_cmp_chibi.len = 1;
// ai_cmp_full: the curtsy pose at 2x the reference scale (reference px*2 + (960 - 560, 0)), for the comparison sheet.
LOOPS.ai_cmp_full = t => {
  ai(960 + (462 - 280) * 2, 534 * 2, 105, { form: 'full', pose: 'curtsy', t, mouth: 'open', blush: .5, float: 0, bob: 0, noShadow: true, blink: 0, seed: 3 });
};
LOOPS.ai_cmp_full.len = 1;

// ai_cmp_fullface: the curtsy head at 5x the reference scale, for the comparison sheet's face close-up.
LOOPS.ai_cmp_fullface = t => {
  ai(960 - (475 - 462) * 5, 540 + (534 - 70) * 5, 262.5, { form: 'full', pose: 'curtsy', t, mouth: 'open', blush: .5, float: 0, bob: 0, noShadow: true, blink: 0, seed: 3 });
};
LOOPS.ai_cmp_fullface.len = 1;
