enum BidStatus { pending, accepted, rejected }

BidStatus bidStatusFromString(String value) {
  switch (value.toLowerCase().trim()) {
    case 'accepted':
      return BidStatus.accepted;
    case 'rejected':
      return BidStatus.rejected;
    case 'pending':
    default:
      return BidStatus.pending;
  }
}

String bidStatusToString(BidStatus status) => status.name;

class DriverBid {
  const DriverBid({
    required this.id,
    required this.loadOfferId,
    required this.driverId,
    required this.amount,
    required this.status,
  });

  final String id;
  final String loadOfferId;
  final String driverId;
  final num amount;
  final BidStatus status;

  factory DriverBid.fromJson(Map<String, dynamic> json) {
    return DriverBid(
      id: (json['id'] ?? '').toString(),
      loadOfferId: (json['load_offer_id'] ?? '').toString(),
      driverId: (json['driver_id'] ?? '').toString(),
      amount: (json['amount'] as num?) ?? 0,
      status: bidStatusFromString((json['status'] ?? 'pending').toString()),
    );
  }
}

