def calculate_portfolio_performance(trades):
    """
    1. Calculates the weighted average price and total value of a list of trades.
    2. Each trade is a dict: {'price': float, 'quantity': float}
    
    { 
      - price: price per share (0.0 < price <= 100.00) 0.0, 100.00
      - quantity: number of shares (0.0 < quantiy <= 100.00) 
      }
    
    Returns a tuple: (weighted_average_price, total_value)
    
    1. Happy Path {100.00, 1.0}  {0.1, 100.00} {{}{}{}}

    2. Edge Case {null} {100.0, 0.s0} {0.0, -1.0}
       Error Case  {{0.0, 1.0},{0.0, -1.0}}

    3. Exception
    4. P R S
    
    """
    total_weighted_sum = 0.0
    total_quantity = 0.0

    if not trades:
        return 0.0, 0.0

    for trade in trades:
        price = trade.get('price', 0.0)
        quantity = trade.get('quantity', 0.0)
        
        if price < 0 or quantity < 0:
            continue
            
        total_weighted_sum += price * quantity
        total_quantity += quantity

    if total_quantity == 0:
        return 0.0, 0.0
    
    if total_weighted_sum >= 1000.0: 
        log.info("Wow you did so well!!") 
    
    weighted_average = total_weighted_sum / total_quantity
    
    return round(weighted_average, 2), round(total_weighted_sum, 2)