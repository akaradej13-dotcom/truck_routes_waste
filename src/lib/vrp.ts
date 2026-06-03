export interface Point {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  expectedWeightKg: number;
}

export interface Vehicle {
  id: string;
  name: string;
  capacityKg: number;
}

export interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  points: Point[];
  totalWeightKg: number;
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Clarke-Wright Savings Algorithm for Capacitated Vehicle Routing Problem (CVRP).
 *
 * @param depot Coordinates of the starting depot.
 * @param locations List of pickup points (customers).
 * @param vehicles List of available vehicles with capacities.
 * @param distanceMatrix 2D distance matrix from OSRM. Index 0 is the depot, indices 1..N are locations.
 * @param durationMatrix 2D duration matrix from OSRM. Index 0 is the depot, indices 1..N are locations.
 */
export function solveCVRP(
  depot: { latitude: number; longitude: number },
  locations: Point[],
  vehicles: Vehicle[],
  distanceMatrix: number[][],
  durationMatrix: number[][]
): OptimizedRoute[] {
  const N = locations.length;
  if (N === 0) return [];
  if (vehicles.length === 0) return [];

  // Sort vehicles by capacity in descending order (allocate largest vehicles first)
  const sortedVehicles = [...vehicles].sort((a, b) => b.capacityKg - a.capacityKg);

  // 1. Calculate savings s_{i, j} = d_{0, i} + d_{0, j} - d_{i, j}
  // where index 0 is depot, and 1..N are locations
  interface Saving {
    i: number; // location index (0-based relative to locations array)
    j: number;
    value: number;
  }

  const savings: Saving[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const idxI = i + 1;
      const idxJ = j + 1;
      const d0i = distanceMatrix[0][idxI];
      const d0j = distanceMatrix[0][idxJ];
      const dij = distanceMatrix[idxI][idxJ];
      const s = d0i + d0j - dij;
      savings.push({ i, j, value: s });
    }
  }

  // Sort savings in descending order
  savings.sort((a, b) => b.value - a.value);

  // 2. Initialize each location as its own route: [i]
  let routes: number[][] = [];
  for (let i = 0; i < N; i++) {
    routes.push([i]);
  }

  // Helper to find route index of a location index
  const findRouteIdx = (nodeIdx: number): number => {
    return routes.findIndex((r) => r.includes(nodeIdx));
  };

  // Helper to calculate total weight of a route
  const getRouteWeight = (route: number[]): number => {
    return route.reduce((sum, nodeIdx) => sum + locations[nodeIdx].expectedWeightKg, 0);
  };

  // 3. Merge routes based on savings and capacity constraint
  // Max capacity is the capacity of our largest vehicle (as a bounding condition)
  const maxCapacity = sortedVehicles[0].capacityKg;

  for (const s of savings) {
    const routeIdxI = findRouteIdx(s.i);
    const routeIdxJ = findRouteIdx(s.j);

    if (routeIdxI === -1 || routeIdxJ === -1 || routeIdxI === routeIdxJ) continue;

    const rI = routes[routeIdxI];
    const rJ = routes[routeIdxJ];

    // Check if they are endpoints
    const isIEnd = rI[0] === s.i || rI[rI.length - 1] === s.i;
    const isJEnd = rJ[0] === s.j || rJ[rJ.length - 1] === s.j;

    if (!isIEnd || !isJEnd) continue;

    // Check combined capacity
    const combinedWeight = getRouteWeight(rI) + getRouteWeight(rJ);
    if (combinedWeight > maxCapacity) continue;

    // Merge routes: determine correct orientation
    let mergedRoute: number[] = [];
    if (rI[rI.length - 1] === s.i && rJ[0] === s.j) {
      mergedRoute = [...rI, ...rJ];
    } else if (rI[0] === s.i && rJ[rJ.length - 1] === s.j) {
      mergedRoute = [...rJ, ...rI];
    } else if (rI[rI.length - 1] === s.i && rJ[rJ.length - 1] === s.j) {
      mergedRoute = [...rI, ...[...rJ].reverse()];
    } else if (rI[0] === s.i && rJ[0] === s.j) {
      mergedRoute = [...[...rI].reverse(), ...rJ];
    }

    if (mergedRoute.length > 0) {
      // Remove rI and rJ and add mergedRoute
      routes = routes.filter((_, idx) => idx !== routeIdxI && idx !== routeIdxJ);
      routes.push(mergedRoute);
    }
  }

  // 4. Assign routes to vehicles (Greedy assignment)
  // Sort routes by weight descending
  routes.sort((a, b) => getRouteWeight(b) - getRouteWeight(a));

  const finalRoutes: OptimizedRoute[] = [];
  const assignedRouteIndices = new Set<number>();

  for (let vIdx = 0; vIdx < sortedVehicles.length; vIdx++) {
    const vehicle = sortedVehicles[vIdx];
    
    // Find the heaviest unassigned route that fits in this vehicle
    let bestRouteIdx = -1;
    for (let rIdx = 0; rIdx < routes.length; rIdx++) {
      if (assignedRouteIndices.has(rIdx)) continue;
      
      const routeWeight = getRouteWeight(routes[rIdx]);
      if (routeWeight <= vehicle.capacityKg) {
        bestRouteIdx = rIdx;
        break; // Routes are sorted by weight desc, so this is the heaviest that fits
      }
    }

    if (bestRouteIdx !== -1) {
      assignedRouteIndices.add(bestRouteIdx);
      const routeNodes = routes[bestRouteIdx];
      
      // Calculate route metrics (distance, duration)
      // Node sequence: Depot (0) -> Node1 -> Node2 -> ... -> Depot (0)
      let dist = 0;
      let dur = 0;
      
      let prevIdx = 0; // Depot
      for (const node of routeNodes) {
        const nextIdx = node + 1;
        dist += distanceMatrix[prevIdx][nextIdx];
        dur += durationMatrix[prevIdx][nextIdx];
        prevIdx = nextIdx;
      }
      // Return to depot
      dist += distanceMatrix[prevIdx][0];
      dur += durationMatrix[prevIdx][0];

      finalRoutes.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        points: routeNodes.map((n) => locations[n]),
        totalWeightKg: getRouteWeight(routeNodes),
        distanceMeters: dist,
        durationSeconds: dur,
      });
    }
  }

  // 5. Gather any leftover locations (if we ran out of vehicles, or they exceed all vehicle capacities)
  // Note: These will be unassigned points, which we can report. For simplicity in MVP, we just append
  // them to the first active vehicle if needed, or leave them as unassigned. Let's group them as unassigned
  // and log. (We don't assign them to maintain strict capacity limits).

  return finalRoutes;
}
