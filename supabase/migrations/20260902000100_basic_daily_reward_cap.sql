-- BASIC earns Rp5 per click with a maximum Rp1.000 offer-reward income per day.
CREATE OR REPLACE FUNCTION public.claim_offer_reward(p_offer_id uuid)
RETURNS TABLE(rewarded boolean, reward_amount numeric, new_balance numeric, daily_limit numeric, daily_earned numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_level public.user_level;
  v_reward numeric;
  v_limit numeric;
  v_earned numeric;
  v_balance_before numeric;
  v_balance_after numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT p.level INTO v_level FROM public.profiles p WHERE p.id=v_user;
  IF v_level IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  SELECT rs.reward_amount INTO v_reward FROM public.reward_settings rs
  WHERE rs.level=v_level AND rs.is_active=true;
  IF v_reward IS NULL OR v_reward<=0 THEN
    RETURN QUERY SELECT false,0::numeric,COALESCE((SELECT b.balance FROM public.balances b WHERE b.user_id=v_user),0),0::numeric,0::numeric;
    RETURN;
  END IF;

  IF v_level::text='basic' THEN v_limit:=1000;
  ELSIF v_level::text='premium' THEN v_limit:=10000;
  ELSIF v_level::text='vip' THEN v_limit:=100000;
  ELSE v_limit:=0; END IF;

  SELECT COALESCE(SUM(bt.amount),0) INTO v_earned FROM public.balance_transactions bt
  WHERE bt.user_id=v_user AND bt.type='credit' AND bt.description ILIKE '%offer%'
    AND bt.created_at>=date_trunc('day',now());

  SELECT b.balance INTO v_balance_before FROM public.balances b WHERE b.user_id=v_user FOR UPDATE;
  IF v_balance_before IS NULL THEN RAISE EXCEPTION 'Balance not found'; END IF;

  IF v_limit<=0 OR v_earned+v_reward>v_limit THEN
    RETURN QUERY SELECT false,v_reward,v_balance_before,v_limit,v_earned; RETURN;
  END IF;

  v_balance_after:=v_balance_before+v_reward;
  UPDATE public.balances SET balance=v_balance_after,updated_at=now() WHERE user_id=v_user;
  INSERT INTO public.balance_transactions(user_id,amount,type,balance_before,balance_after,description)
  VALUES(v_user,v_reward,'credit',v_balance_before,v_balance_after,'Offer click reward');

  RETURN QUERY SELECT true,v_reward,v_balance_after,v_limit,v_earned+v_reward;
END;
$function$;

UPDATE public.reward_settings
SET reward_amount=5, is_active=true, updated_at=now()
WHERE level='basic';
