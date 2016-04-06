#include <bits/stdc++.h>
#define pp pair<double, double>
#define PI atan(1) * 4
using namespace std;

double degToRad(double deg) {
	return deg * PI / 180.0;
}

double latLongDist(pp x, pp y) {
	//function taken from http://www.movable-type.co.uk/scripts/latlong.html
	double R = 6371; // Radius of the earth in km
	double dLat = degToRad(y.first - x.first);
	double dLon = degToRad(y.second - x.second); 
	double a = sin(dLat/2) * sin(dLat/2);
	a += cos(degToRad(x.first)) * cos(degToRad(y.first)) * sin(dLon/2) * sin(dLon/2); 
	double c = 2 * atan2(sqrt(a), sqrt(1-a));
	double d = R * c; // Distance in km
	return d;
}

void kCluster(vector<pp> coords, vector<int> &clusterMap, int noPlaces, int noClusters) {
	vector<pp> clusters(noClusters);
	int repeatFor = 100;
	int i, j, k;

	for (i = 0; i < noClusters; ++i)
		clusters[i] = coords[i];

	for (i = 0; i < repeatFor; ++i) {
		for (j = 0; j < noPlaces; ++j) {
			int minDistCluster = 0;
			double minDist = latLongDist(coords[j], clusters[0]);
			for (k = 1; k < noClusters; ++k) {
				if (latLongDist(coords[j], clusters[k]) < minDist)
					minDistCluster = k;
			}
			clusterMap[j] = minDistCluster;
		}
		for (j = 0; j < noClusters; ++j) {
			pp sum(0.0, 0.0);
			int count = 0;
			for (k = 0; k < noPlaces; ++k) {
				if (clusterMap[k] == j) {
					sum.first += coords[k].first;
					sum.second += coords[k].second;
					count++;
				}
			}
			if (count > 0)
				clusters[j] = pp(sum.first/count, sum.second/count);
		}
	}
}

template<class T>
void printList(vector<T> v) {
	int i;
	for (i = 0; i < v.size(); ++i) {
		cout<<v[i]<<' ';
	}
	cout<<endl;
}

int main() {
	int noPlaces, noTrucks;
	cin>>noPlaces;
	cin>>noTrucks;
	vector<pp> coords(noPlaces); //List of coordinates of clients
	pp depoCoords; //Coordinates of depo
	vector<vector<double> > distMatrix(noPlaces + 1); //Distance matrix
	vector<int> clusterMap(noPlaces); //Maps each client location to a cluster number
	vector<vector<int> > clusters(noTrucks); //Maps each cluster number to a subset of clients
	int i, j;

	//Get client coordinates
	for (i = 0; i < noPlaces; ++i) {
		pp p;
		cin>>p.first>>p.second;
		coords[i] = p;
	}
	//Get depo coordinates
	cin>>depoCoords.first>>depoCoords.second;
	/*for (i = 0; i < noPlaces; ++i) {
		for (j = 0; j < noPlaces; ++j) {
			int elt;
			cin>>elt;
			distMatrix[i].push_back(elt);
		}
	}*/
	//Dummy distance matrix for testing
	for (i = 0; i < noPlaces; ++i) {
		for (j = 0; j < noPlaces; ++j)
			distMatrix[i].push_back(latLongDist(coords[i], coords[j]));
	}
	for (i = 0; i < noPlaces; ++i)
		distMatrix[noPlaces].push_back(latLongDist(coords[i], depoCoords));
	for (i = 0; i < noPlaces; ++i)
		distMatrix[i].push_back(latLongDist(coords[i], depoCoords));
	distMatrix[noPlaces].push_back(0.0);

	//Execute clustering algorithm to group clients into clusters
	kCluster(coords, clusterMap, noPlaces, noTrucks);

	//Simultaneously output and build clusters
	for (i = 0; i < noPlaces; ++i) {
		cout<<clusterMap[i]<<' ';
		clusters[clusterMap[i]].push_back(i);
	}
	cout<<endl;
	//Add depo to each cluster
	for (i = 0; i < noTrucks; ++i) {
		clusters[i].push_back(noPlaces);
	}

	//Find shortest path for each cluster. One truck for one cluster
	for (i = 0; i < noTrucks; ++i) {
		//Skip if cluster is empty.
		if (clusters[i].size() <= 1)
			continue;

		//Initialize optimal permutation of clients and minimum distance
		vector<int> minPerm = clusters[i];
		double minCost = 0.0;

		for (j = 0; j < clusters[i].size() - 1; ++j)
			minCost += distMatrix[clusters[i][j]][clusters[i][j + 1]];
		minCost += distMatrix[clusters[i][clusters[i].size() - 1]][clusters[i][0]];

		//Go over all permutations in this cluster
		do {
			double cost = 0.0;

			for (j = 0; j < clusters[i].size() - 1; ++j)
				cost += distMatrix[clusters[i][j]][clusters[i][j + 1]];
			cost += distMatrix[clusters[i][clusters[i].size() - 1]][clusters[i][0]];

			if (cost < minCost) {
				minPerm = clusters[i];
				minCost = cost;
			}

		} while(next_permutation(clusters[i].begin(), clusters[i].end()));

		//Output the best permutation
		cout<<i<<' ';
		for (j = 0; j < clusters[i].size(); ++j) {
			cout<<clusters[i][j]<<' ';
		}
		cout<<endl;
	}

	return 0;
}