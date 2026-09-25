-- Seed data for local development and initial production catalog content.
-- Sourced directly from the client specification (sections 4, 5, 6, 8, 9).

-- ============================================================================
-- specializations (client spec §4)
-- ============================================================================
insert into public.specializations (key, label_ro, label_en) values
  ('general_dentistry', 'Stomatologie generală', 'General dentistry'),
  ('implantology', 'Implantologie', 'Implantology'),
  ('prosthetics', 'Protetică', 'Prosthetics'),
  ('orthodontics', 'Ortodonție', 'Orthodontics'),
  ('endodontics', 'Endodonție', 'Endodontics'),
  ('oral_surgery', 'Chirurgie orală', 'Oral surgery'),
  ('periodontology', 'Parodontologie', 'Periodontology'),
  ('pedodontics', 'Pedodonție', 'Pedodontics'),
  ('cosmetic_dentistry', 'Estetică dentară', 'Cosmetic dentistry');

-- ============================================================================
-- services — clinic services (client spec §5)
-- ============================================================================
insert into public.services (key, label_ro, label_en, category) values
  ('consultation', 'Consultație', 'Consultation', 'clinic'),
  ('dental_implant', 'Implant dentar', 'Dental implant', 'clinic'),
  ('all_on_4', 'All-on-4', 'All-on-4', 'both'),
  ('all_on_6', 'All-on-6', 'All-on-6', 'both'),
  ('veneers', 'Fațete', 'Veneers', 'both'),
  ('zirconia_crowns', 'Coroane zirconiu', 'Zirconia crowns', 'both'),
  ('ceramic_crowns', 'Coroane ceramică', 'Ceramic crowns', 'both'),
  ('teeth_whitening', 'Albire', 'Teeth whitening', 'clinic'),
  ('orthodontics_service', 'Ortodonție', 'Orthodontics', 'clinic'),
  ('endodontics_service', 'Endodonție', 'Endodontics', 'clinic'),
  ('oral_surgery_service', 'Chirurgie', 'Surgery', 'clinic'),
  ('hygiene', 'Igienizare', 'Hygiene / cleaning', 'clinic');

-- ============================================================================
-- services — laboratory services (client spec §8)
-- ============================================================================
insert into public.services (key, label_ro, label_en, category) values
  ('zirconia', 'Zirconiu', 'Zirconia', 'laboratory'),
  ('emax', 'E.max', 'E.max', 'laboratory'),
  ('metal_ceramic', 'Metaloceramică', 'Metal-ceramic', 'laboratory'),
  ('lab_implantology', 'Implantologie', 'Implantology', 'laboratory'),
  ('all_on_x', 'All-on-X', 'All-on-X', 'laboratory'),
  ('dentures', 'Proteze', 'Dentures', 'laboratory'),
  ('cad_cam', 'CAD/CAM', 'CAD/CAM', 'laboratory'),
  ('digital_design', 'Design digital', 'Digital design', 'laboratory'),
  ('full_contour', 'Full Contour', 'Full Contour', 'laboratory'),
  ('titanium_bar', 'Bară titan', 'Titanium bar', 'laboratory'),
  ('pmma', 'PMMA', 'PMMA', 'laboratory'),
  ('wax_up', 'Wax-up', 'Wax-up', 'laboratory');

-- ============================================================================
-- portfolio_categories — clinic (client spec §6) + laboratory (client spec §9)
-- ============================================================================
insert into public.portfolio_categories (key, label_ro, label_en, applies_to) values
  ('implantology_case', 'Implantologie', 'Implantology', 'both'),
  ('aesthetics', 'Estetică', 'Aesthetics', 'clinic'),
  ('veneers_case', 'Fațete', 'Veneers', 'both'),
  ('all_on_x_case', 'All-on-X', 'All-on-X', 'both'),
  ('orthodontics_case', 'Ortodonție', 'Orthodontics', 'clinic'),
  ('full_mouth_rehab', 'Full Mouth Rehabilitation', 'Full Mouth Rehabilitation', 'both'),
  ('anterior', 'Anterior', 'Anterior', 'laboratory'),
  ('posterior', 'Posterior', 'Posterior', 'laboratory'),
  ('zirconia_case', 'Zirconiu', 'Zirconia', 'laboratory'),
  ('emax_case', 'E.max', 'E.max', 'laboratory');

