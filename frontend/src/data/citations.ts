// The citation registry. ADR-0017 clause 4.2: EVERY entry carries a real, verifiable DOI or URL.
// A bare author-year string with no link is a FAIL, because it reads as fabricated and may be.
//
// Every DOI below was resolved through the Crossref REST API on 2026-08-01 during the research pass
// that produced wip/stocktwin/. The two entries that could not be resolved carry a URL instead and say
// why in their label; the one that could not be verified at all is NOT in this list and is not cited
// anywhere in the product.

import type { Citation } from '@fasl-work/caos-app-shell';

export const CITATIONS: Citation[] = [
  {
    id: 'young2021',
    label: 'Young and Rogers (2021)',
    citation: 'Young, A. and Rogers, W.P. Modelling Large Heaped Fill Stockpiles Using FMS Data. Minerals 11(6), 636, 2021. The only academic treatment of the object this product models: a large, truck-dumped, pre-crusher run-of-mine stockpile. Source of the two-phase construction model, the five fill types, and the dump-location-polygon data schema.',
    doi: '10.3390/min11060636',
  },
  {
    id: 'young2022',
    label: 'Young and Rogers (2022)',
    citation: 'Young, A. and Rogers, W.P. A High-Fidelity Modelling Method for Mine Haul Truck Dumping Process. Mining 2(1), 86-102, 2022. Twenty-eight individual CAT 793F dumps surveyed by UAV photogrammetry, classified into four profile types. Table 5 is the envelope this engine calibrates its dump geometry against.',
    doi: '10.3390/mining2010006',
  },
  {
    id: 'youngdata2021',
    label: 'Young (2021), dataset',
    citation: 'Young, A. Mine Haul Truck Rear Dump Profiles. Zenodo, 2021. The 3-D CAD surfaces behind the measurements above, CC BY 4.0. Cited as the underlying evidence; this engine calibrates against the published table rather than against the surfaces themselves.',
    doi: '10.5281/zenodo.5789951',
  },
  {
    id: 'moraga2017',
    label: 'Moraga and others (2017)',
    citation: 'Methodology for a dump design optimization in large-scale open pit mines. Cogent Engineering 4(1), 1387955, 2017. Source of the lift-and-ramp construction: a footprint is built by deep dumping and then ramped up by a determined lift height, with access to successive lifts by ramps of suitable width and gradient.',
    doi: '10.1080/23311916.2017.1387955',
  },
  {
    id: 'bak1987',
    label: 'Bak, Tang and Wiesenfeld (1987)',
    citation: 'Bak, P., Tang, C. and Wiesenfeld, K. Self-organized criticality: an explanation of the 1/f noise. Physical Review Letters 59(4), 381-384, 1987.',
    doi: '10.1103/PhysRevLett.59.381',
  },
  {
    id: 'savage1988',
    label: 'Savage and Lun (1988)',
    citation: 'Savage, S.B. and Lun, C.K.K. Particle size segregation in inclined chute flow of dry cohesionless granular solids. Journal of Fluid Mechanics 189, 311-335, 1988.',
    doi: '10.1017/S002211208800103X',
  },
  {
    id: 'bouchaud1994',
    label: 'Bouchaud, Cates, Ravi Prakash and Edwards (1994)',
    citation: 'Bouchaud, J.P., Cates, M.E., Ravi Prakash, J. and Edwards, S.F. A model for the dynamics of sandpile surfaces. Journal de Physique I 4(10), 1383-1410, 1994.',
    doi: '10.1051/jp1:1994195',
  },
  {
    id: 'makse1997',
    label: 'Makse, Havlin, King and Stanley (1997)',
    citation: 'Makse, H.A., Havlin, S., King, P.R. and Stanley, H.E. Spontaneous stratification in granular mixtures. Nature 386(6623), 379-382, 1997.',
    doi: '10.1038/386379a0',
  },
  {
    id: 'samadani2001',
    label: 'Samadani and Kudrolli (2001)',
    citation: 'Samadani, A. and Kudrolli, A. Angle of repose and segregation in cohesive granular matter. Physical Review E 64(5), 051301, 2001.',
    doi: '10.1103/PhysRevE.64.051301',
  },
  {
    id: 'pavloudakis2003',
    label: 'Pavloudakis and Agioutantis (2003)',
    citation: 'Pavloudakis, F.F. and Agioutantis, Z. Simulation of bulk solids blending in longitudinal stockpiles. International Journal of Surface Mining, Reclamation and Environment 17(2), 98-112, 2003.',
    doi: '10.1076/ijsm.17.2.98.14127',
  },
  {
    id: 'robinson2004',
    label: 'Robinson (2004)',
    citation: 'Robinson, G.K. How much would a blending stockpile reduce variation? Chemometrics and Intelligent Laboratory Systems 74(1), 121-133, 2004.',
    doi: '10.1016/j.chemolab.2004.03.010',
  },
  {
    id: 'petersen2004',
    label: 'Petersen (2004)',
    citation: 'Petersen, I.F. Blending in circular and longitudinal mixing piles. Chemometrics and Intelligent Laboratory Systems 74(1), 135-141, 2004.',
    doi: '10.1016/j.chemolab.2004.03.018',
  },
  {
    id: 'gray2005',
    label: 'Gray and Thornton (2005)',
    citation: 'Gray, J.M.N.T. and Thornton, A.R. A theory for particle size segregation in shallow granular free-surface flows. Proceedings of the Royal Society A 461(2057), 1447-1473, 2005.',
    doi: '10.1098/rspa.2004.1420',
  },
  {
    id: 'kumral2006',
    label: 'Kumral (2006)',
    citation: 'Kumral, M. Bed blending design incorporating multiple regression modelling and genetic algorithms. Journal of the South African Institute of Mining and Metallurgy 106(3), 229-236, 2006. No DOI is registered for this volume; the publisher hosts the full text.',
    url: 'https://www.saimm.co.za/Journal/v106n03p229.pdf',
  },
  {
    id: 'jop2006',
    label: 'Jop, Forterre and Pouliquen (2006)',
    citation: 'Jop, P., Forterre, Y. and Pouliquen, O. A constitutive law for dense granular flows. Nature 441(7094), 727-730, 2006.',
    doi: '10.1038/nature04801',
  },
  {
    id: 'espinoza2013',
    label: 'Espinoza, Goycoolea, Moreno and Newman (2013)',
    citation: 'Espinoza, D., Goycoolea, M., Moreno, E. and Newman, A. MineLib: a library of open pit mining problems. Annals of Operations Research 206(1), 93-114, 2013.',
    doi: '10.1007/s10479-012-1258-3',
  },
  {
    id: 'marques2013',
    label: 'Marques and Costa (2013)',
    citation: 'Marques, D.M. and Costa, J.F.C.L. An algorithm to simulate ore grade variability in blending and homogenization piles. International Journal of Mineral Processing 120, 48-55, 2013.',
    doi: '10.1016/j.minpro.2013.01.003',
  },
  {
    id: 'gray2014',
    label: 'Gray and Edwards (2014)',
    citation: 'Gray, J.M.N.T. and Edwards, A.N. A depth-averaged mu(I)-rheology for shallow granular free-surface flows. Journal of Fluid Mechanics 755, 503-534, 2014.',
    doi: '10.1017/jfm.2014.450',
  },
  {
    id: 'loubser2015',
    label: 'Loubser and de Korte (2015)',
    citation: 'Loubser, Z. and de Korte, J. Investigation of factors influencing blending efficiency on circular stockpiles through modelling and simulation. Journal of the Southern African Institute of Mining and Metallurgy 115(8), 773-780, 2015.',
    doi: '10.17159/2411-9717/2015/v115n8a15',
  },
  {
    id: 'zhao2015',
    label: 'Zhao, Lu, Koch and Hurdsman (2015)',
    citation: 'Zhao, S., Lu, T.F., Koch, B. and Hurdsman, A. 3D stockpile modelling and quality calculation for continuous stockpile management. International Journal of Mineral Processing 140, 32-42, 2015.',
    doi: '10.1016/j.minpro.2015.04.012',
  },
  {
    id: 'zhao2015b',
    label: 'Zhao, Lu, Koch and Hurdsman (2015b)',
    citation: 'Zhao, S., Lu, T.F., Koch, B. and Hurdsman, A. Automatic quality estimation in blending using a 3D stockpile management model. Advanced Engineering Informatics 29(3), 680-695, 2015.',
    doi: '10.1016/j.aei.2015.07.002',
  },
  {
    id: 'gray2018',
    label: 'Gray (2018)',
    citation: 'Gray, J.M.N.T. Particle segregation in dense granular flows. Annual Review of Fluid Mechanics 50(1), 407-433, 2018.',
    doi: '10.1146/annurev-fluid-122316-045201',
  },
  {
    id: 'li2019',
    label: 'Li, de Werk, St-Pierre and Kumral (2019)',
    citation: 'Li, S., de Werk, M., St-Pierre, L. and Kumral, M. Dimensioning a stockpile operation using principal component analysis. International Journal of Minerals, Metallurgy and Materials 26(12), 1485-1494, 2019.',
    doi: '10.1007/s12613-019-1849-y',
  },
  {
    id: 'zhao2021',
    label: 'Zhao, Lu, Statsenko and Koch (2021)',
    citation: 'Zhao, S., Lu, T.F., Statsenko, L. and Koch, B. A framework for near real-time ROM stockpile modelling to improve blending efficiency. Journal of Engineering, Design and Technology 20(2), 497-515, 2021.',
    doi: '10.1108/JEDT-12-2020-0541',
  },
  {
    id: 'muller2022',
    label: 'Muller, Schuler, Zech and Hesse (2022)',
    citation: 'Muller, S., Schuler, L., Zech, A. and Hesse, F. GSTools v1.3: a toolbox for geostatistical modelling in Python. Geoscientific Model Development 15, 3161-3182, 2022.',
    doi: '10.5194/gmd-15-3161-2022',
  },
  {
    id: 'moraga2022',
    label: 'Moraga, Kracht and Ortiz (2022)',
    citation: 'Moraga, C., Kracht, W. and Ortiz, J.M. Process simulation to determine blending and residence time distribution in mineral processing plants. Minerals Engineering 187, 107807, 2022.',
    doi: '10.1016/j.mineng.2022.107807',
  },
  {
    id: 'schramm2021',
    label: 'Schramm (2021)',
    citation: 'Schramm, R. Design of blending beds. AT minerals processing 06/2021. Reports a mixing effect of 5 to 7.5 for beds of 200 to 600 layers, the only quantified anchor found for a real bed. Trade publication, no DOI.',
    url: 'https://www.at-minerals.com/en/artikel/at_Design_of_blending_beds-3658023.html',
  },
  {
    id: 'wartsila',
    label: 'Wartsila Encyclopedia, angle of repose',
    citation: 'Wartsila Encyclopedia of Marine and Energy Technology, entry "angle of repose". Reports ores from about 34 degrees (copper, Norway) to about 60 degrees (copper, Peru). A handbook range, used as a range and never as a measured value for a specific material.',
    url: 'https://www.wartsila.com/encyclopedia/term/angle-of-repose',
  },
  {
    id: 'oreblocks',
    label: 'oreblocks (software note)',
    citation: 'Santibanez-Leal, F. oreblocks: license-free synthetic ore-body block models with a stamped exact ultimate-pit optimum. Software note, CC-BY-4.0.',
    doi: '10.5281/zenodo.21512088',
  },
];
