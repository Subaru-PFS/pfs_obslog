--
-- PostgreSQL database dump
--

-- Dumped from database version 13.2
-- Dumped by pg_dump version 13.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO michitaro;

--
-- Name: beam_switch_mode; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.beam_switch_mode (
    beam_switch_mode_id integer NOT NULL,
    beam_switch_mode_name character varying,
    beam_switch_mode_description character varying
);


ALTER TABLE public.beam_switch_mode OWNER TO michitaro;

--
-- Name: calib; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.calib (
    calib_id bigint NOT NULL,
    calib_type character varying,
    sps_frames_to_use character varying,
    pfs_config_id bigint,
    calib_date timestamp without time zone
);


ALTER TABLE public.calib OWNER TO michitaro;

--
-- Name: calib_calib_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.calib_calib_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.calib_calib_id_seq OWNER TO michitaro;

--
-- Name: calib_calib_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.calib_calib_id_seq OWNED BY public.calib.calib_id;


--
-- Name: calib_set; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.calib_set (
    calib_set_id integer NOT NULL,
    calib_flat_id integer,
    calib_bias_id integer,
    calib_dark_id integer,
    calib_arcs_id integer
);


ALTER TABLE public.calib_set OWNER TO michitaro;

--
-- Name: calib_set_calib_set_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.calib_set_calib_set_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.calib_set_calib_set_id_seq OWNER TO michitaro;

--
-- Name: calib_set_calib_set_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.calib_set_calib_set_id_seq OWNED BY public.calib_set.calib_set_id;


--
-- Name: cloud_condition; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cloud_condition (
    cloud_condition_id integer NOT NULL,
    cloud_condition_name character varying,
    cloud_condition_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.cloud_condition OWNER TO michitaro;

--
-- Name: cobra; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra (
    cobra_id integer NOT NULL,
    field_on_pfi integer,
    cobra_in_field integer,
    module_in_field integer,
    cobra_in_module integer,
    module_name character varying(3),
    sps_camera_id integer,
    slit_hole_sps integer,
    cobra_id_sps integer,
    cobra_id_lna character varying(12),
    version character varying
);


ALTER TABLE public.cobra OWNER TO michitaro;

--
-- Name: cobra_convergence_test; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_convergence_test (
    cobra_motor_model_id integer NOT NULL,
    iteration integer NOT NULL,
    cobra_motor_angle_target_id integer NOT NULL,
    cobra_motor_angle_target real,
    cobra_motor_angle_difference real,
    signal_to_noise_ratio real
);


ALTER TABLE public.cobra_convergence_test OWNER TO michitaro;

--
-- Name: COLUMN cobra_convergence_test.iteration; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_convergence_test.iteration IS 'The iteration number';


--
-- Name: COLUMN cobra_convergence_test.cobra_motor_angle_target_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_convergence_test.cobra_motor_angle_target_id IS 'The ID for the target angle of the motor to test';


--
-- Name: COLUMN cobra_convergence_test.cobra_motor_angle_target; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_convergence_test.cobra_motor_angle_target IS 'The target angle of the motor to test';


--
-- Name: COLUMN cobra_convergence_test.cobra_motor_angle_difference; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_convergence_test.cobra_motor_angle_difference IS 'The difference of the motor angle [deg.]';


--
-- Name: COLUMN cobra_convergence_test.signal_to_noise_ratio; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_convergence_test.signal_to_noise_ratio IS 'Signal-to-Noise ratio';


--
-- Name: cobra_geometry; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_geometry (
    cobra_motor_calib_id integer NOT NULL,
    cobra_id integer NOT NULL,
    cobra_center_on_pfi_x_mm real,
    cobra_center_on_pfi_y_mm real,
    cobra_distance_from_center_mm real,
    cobra_motor_theta_limit0 real,
    cobra_motor_theta_limit1 real,
    cobra_motor_theta_length real,
    cobra_motor_phi_limit_in real,
    cobra_motor_phi_limit_out real,
    cobra_motor_phi_length real,
    cobra_status character varying
);


ALTER TABLE public.cobra_geometry OWNER TO michitaro;

--
-- Name: COLUMN cobra_geometry.cobra_status; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_geometry.cobra_status IS 'OK/INVISIBLE/LOCKED_THETA/LOCKED_PHI/BAD_THETA/BAD_PHI';


--
-- Name: cobra_motor_axis; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_motor_axis (
    cobra_motor_axis_id integer NOT NULL,
    cobra_motor_axis_name character varying
);


ALTER TABLE public.cobra_motor_axis OWNER TO michitaro;

--
-- Name: COLUMN cobra_motor_axis.cobra_motor_axis_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_axis.cobra_motor_axis_id IS 'Motor axis stage number [1,2]';


--
-- Name: COLUMN cobra_motor_axis.cobra_motor_axis_name; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_axis.cobra_motor_axis_name IS 'Corresponding name for axis [Theta, Phi]';


--
-- Name: cobra_motor_calib; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_motor_calib (
    cobra_motor_calib_id integer NOT NULL,
    calibrated_at timestamp without time zone,
    comments character varying
);


ALTER TABLE public.cobra_motor_calib OWNER TO michitaro;

--
-- Name: COLUMN cobra_motor_calib.calibrated_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_calib.calibrated_at IS 'Date at which the model calibration took place [YYYY-MM-DDhh:mm:ss]';


--
-- Name: COLUMN cobra_motor_calib.comments; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_calib.comments IS 'Comments';


--
-- Name: cobra_motor_calib_cobra_motor_calib_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.cobra_motor_calib_cobra_motor_calib_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cobra_motor_calib_cobra_motor_calib_id_seq OWNER TO michitaro;

--
-- Name: cobra_motor_calib_cobra_motor_calib_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.cobra_motor_calib_cobra_motor_calib_id_seq OWNED BY public.cobra_motor_calib.cobra_motor_calib_id;


--
-- Name: cobra_motor_direction; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_motor_direction (
    cobra_motor_direction_id integer NOT NULL,
    cobra_motor_direction_name character varying
);


ALTER TABLE public.cobra_motor_direction OWNER TO michitaro;

--
-- Name: COLUMN cobra_motor_direction.cobra_motor_direction_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_direction.cobra_motor_direction_id IS 'Motor movement direction [0,1]';


--
-- Name: COLUMN cobra_motor_direction.cobra_motor_direction_name; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_direction.cobra_motor_direction_name IS 'Corresponding name for the movement [Forward, Reverse]';


--
-- Name: cobra_motor_map; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_motor_map (
    cobra_motor_model_id integer NOT NULL,
    cobra_motor_move_sequence integer NOT NULL,
    cobra_motor_angle real,
    cobra_motor_speed real
);


ALTER TABLE public.cobra_motor_map OWNER TO michitaro;

--
-- Name: COLUMN cobra_motor_map.cobra_motor_move_sequence; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_map.cobra_motor_move_sequence IS 'The motor movement sequence';


--
-- Name: COLUMN cobra_motor_map.cobra_motor_angle; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_map.cobra_motor_angle IS 'The angle of the motor [deg]';


--
-- Name: COLUMN cobra_motor_map.cobra_motor_speed; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_map.cobra_motor_speed IS 'The speed of the motor [deg/step] (TBC)';


--
-- Name: cobra_motor_model; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_motor_model (
    cobra_motor_model_id integer NOT NULL,
    cobra_motor_calib_id integer,
    cobra_id integer,
    cobra_motor_axis_id integer,
    cobra_motor_direction_id integer,
    cobra_motor_on_time real,
    cobra_motor_step_size real,
    cobra_motor_frequency real
);


ALTER TABLE public.cobra_motor_model OWNER TO michitaro;

--
-- Name: COLUMN cobra_motor_model.cobra_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_model.cobra_id IS 'The cobra fiber identifier';


--
-- Name: COLUMN cobra_motor_model.cobra_motor_on_time; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_model.cobra_motor_on_time IS 'The ontime level';


--
-- Name: COLUMN cobra_motor_model.cobra_motor_step_size; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_model.cobra_motor_step_size IS 'The step size resolution';


--
-- Name: COLUMN cobra_motor_model.cobra_motor_frequency; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_motor_model.cobra_motor_frequency IS 'The motor frequency';


--
-- Name: cobra_motor_model_cobra_motor_model_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.cobra_motor_model_cobra_motor_model_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cobra_motor_model_cobra_motor_model_id_seq OWNER TO michitaro;

--
-- Name: cobra_motor_model_cobra_motor_model_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.cobra_motor_model_cobra_motor_model_id_seq OWNED BY public.cobra_motor_model.cobra_motor_model_id;


--
-- Name: cobra_movement; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_movement (
    mcs_frame_id integer NOT NULL,
    cobra_id integer NOT NULL,
    cobra_motor_calib_id integer,
    motor_num_step_theta integer,
    motor_on_time_theta real,
    motor_num_step_phi integer,
    motor_on_time_phi real
);


ALTER TABLE public.cobra_movement OWNER TO michitaro;

--
-- Name: COLUMN cobra_movement.mcs_frame_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.mcs_frame_id IS 'MCS frame identifier. Provided by Gen2';


--
-- Name: COLUMN cobra_movement.cobra_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.cobra_id IS 'Fiber identifier';


--
-- Name: COLUMN cobra_movement.motor_num_step_theta; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.motor_num_step_theta IS 'the number of steps the theta motor has undertaken';


--
-- Name: COLUMN cobra_movement.motor_on_time_theta; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.motor_on_time_theta IS 'the theta motor ontime value';


--
-- Name: COLUMN cobra_movement.motor_num_step_phi; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.motor_num_step_phi IS 'the number of steps the phi motor has undertaken';


--
-- Name: COLUMN cobra_movement.motor_on_time_phi; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_movement.motor_on_time_phi IS 'the phi motor ontime value';


--
-- Name: cobra_status; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.cobra_status (
    mcs_frame_id integer NOT NULL,
    cobra_id integer NOT NULL,
    spot_id integer,
    pfs_config_id bigint,
    iteration integer,
    pfi_target_x_mm real,
    pfi_target_y_mm real,
    pfi_center_x_mm real,
    pfi_center_y_mm real
);


ALTER TABLE public.cobra_status OWNER TO michitaro;

--
-- Name: COLUMN cobra_status.cobra_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.cobra_id IS 'Fiber identifier';


--
-- Name: COLUMN cobra_status.spot_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.spot_id IS 'Corresponding MCS image spot identifier ';


--
-- Name: COLUMN cobra_status.iteration; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.iteration IS 'Iteration number for this frame';


--
-- Name: COLUMN cobra_status.pfi_target_x_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.pfi_target_x_mm IS 'Target x-position on the PFI as determined from the  pfs_design_fiber table [mm]';


--
-- Name: COLUMN cobra_status.pfi_target_y_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.pfi_target_y_mm IS 'Target y-position on the PFI as determined from the  pfs_design_fiber table [mm]';


--
-- Name: COLUMN cobra_status.pfi_center_x_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.pfi_center_x_mm IS 'Actual x-position on the PFI [mm]';


--
-- Name: COLUMN cobra_status.pfi_center_y_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.cobra_status.pfi_center_y_mm IS 'Actual y-position on the PFI [mm]';


--
-- Name: drp1d; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.drp1d (
    pfs_object_id bigint NOT NULL,
    z_best real,
    z_best_err real,
    z_best_reliability real,
    obj_type_id integer,
    flags integer,
    processed_at timestamp without time zone NOT NULL,
    drp1d_version character varying
);


ALTER TABLE public.drp1d OWNER TO michitaro;

--
-- Name: drp1d_line; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.drp1d_line (
    pfs_object_id bigint NOT NULL,
    line_id integer NOT NULL,
    line_name character varying,
    line_wave real,
    line_z real,
    line_z_err real,
    line_sigma real,
    line_sigma_err real,
    line_vel real,
    line_vel_err real,
    line_flux real,
    line_flux_err real,
    line_ew real,
    line_ew_err real,
    line_cont_level real,
    line_cont_level_err real,
    processed_at timestamp without time zone NOT NULL
);


ALTER TABLE public.drp1d_line OWNER TO michitaro;

--
-- Name: drp1d_redshift; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.drp1d_redshift (
    pfs_object_id bigint NOT NULL,
    z real,
    z_err real,
    zrank real,
    reliability real,
    spec_class character varying,
    spec_subclass character varying,
    processed_at timestamp without time zone NOT NULL
);


ALTER TABLE public.drp1d_redshift OWNER TO michitaro;

--
-- Name: drp_ga; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.drp_ga (
    pfs_object_id bigint NOT NULL,
    star_type_id integer,
    velocity real,
    metallicity real,
    logg real,
    teff real,
    flags integer,
    processed_at timestamp without time zone NOT NULL,
    drp_ga_version character varying
);


ALTER TABLE public.drp_ga OWNER TO michitaro;

--
-- Name: fiducial_fiber; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.fiducial_fiber (
    fiducial_fiber_id integer NOT NULL,
    field_on_pfi integer,
    ff_in_field integer,
    ff_type character varying(5),
    ff_id_in_type integer,
    version character varying
);


ALTER TABLE public.fiducial_fiber OWNER TO michitaro;

--
-- Name: fiducial_fiber_geometry; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.fiducial_fiber_geometry (
    fiducial_fiber_id integer NOT NULL,
    ff_center_on_pfi_x_mm real,
    ff_center_on_pfi_y_mm real
);


ALTER TABLE public.fiducial_fiber_geometry OWNER TO michitaro;

--
-- Name: flux_calib; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.flux_calib (
    flux_calib_id integer NOT NULL,
    flux_calib_type character varying,
    flux_calib_date timestamp without time zone,
    flux_calib_star_teff real,
    flux_calib_star_logg real,
    flux_calib_star_z real
);


ALTER TABLE public.flux_calib OWNER TO michitaro;

--
-- Name: guide_stars; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.guide_stars (
    guide_star_id bigint NOT NULL,
    ra double precision,
    decl double precision,
    cat_id integer,
    obj_type_id integer,
    mag_agc real,
    flux_agc real,
    flags integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.guide_stars OWNER TO michitaro;

--
-- Name: input_catalog; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.input_catalog (
    cat_id integer NOT NULL,
    input_catalog_name character varying,
    input_catalog_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.input_catalog OWNER TO michitaro;

--
-- Name: line_list; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.line_list (
    line_id integer NOT NULL,
    line_name character varying,
    line_wavelength real,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.line_list OWNER TO michitaro;

--
-- Name: mcs_boresight; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.mcs_boresight (
    pfs_visit_id integer NOT NULL,
    mcs_boresight_x_pix real,
    mcs_boresight_y_pix real,
    calculated_at timestamp without time zone
);


ALTER TABLE public.mcs_boresight OWNER TO michitaro;

--
-- Name: mcs_data; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.mcs_data (
    mcs_frame_id integer NOT NULL,
    spot_id integer NOT NULL,
    mcs_center_x_pix real,
    mcs_center_y_pix real,
    mcs_second_moment_x_pix real,
    mcs_second_moment_y_pix real,
    mcs_second_moment_xy_pix real,
    bgvalue real,
    peakvalue real
);


ALTER TABLE public.mcs_data OWNER TO michitaro;

--
-- Name: COLUMN mcs_data.spot_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.spot_id IS 'The cobra spot identifier';


--
-- Name: COLUMN mcs_data.mcs_center_x_pix; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.mcs_center_x_pix IS 'The x-center of the spot image in MCS [pix]';


--
-- Name: COLUMN mcs_data.mcs_center_y_pix; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.mcs_center_y_pix IS 'The y-center of the spot image in MCS [pix]]';


--
-- Name: COLUMN mcs_data.mcs_second_moment_x_pix; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.mcs_second_moment_x_pix IS 'The x-component of the second moment of the image in MCS [pix^2]';


--
-- Name: COLUMN mcs_data.mcs_second_moment_y_pix; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.mcs_second_moment_y_pix IS 'The y-component of the second moment  of the image [pix^2]';


--
-- Name: COLUMN mcs_data.mcs_second_moment_xy_pix; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.mcs_second_moment_xy_pix IS 'The xy-component of the second moment  of the image [pix^2]';


--
-- Name: COLUMN mcs_data.bgvalue; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.bgvalue IS 'The background level';


--
-- Name: COLUMN mcs_data.peakvalue; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_data.peakvalue IS 'The peak image value';


--
-- Name: mcs_exposure; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.mcs_exposure (
    mcs_frame_id integer NOT NULL,
    pfs_visit_id integer,
    mcs_exptime real,
    altitude real,
    azimuth real,
    insrot real,
    adc_pa real,
    dome_temperature real,
    dome_pressure real,
    dome_humidity real,
    outside_temperature real,
    outside_pressure real,
    outside_humidity real,
    mcs_cover_temperature real,
    mcs_m1_temperature real,
    taken_at timestamp without time zone,
    taken_in_hst_at timestamp without time zone
);


ALTER TABLE public.mcs_exposure OWNER TO michitaro;

--
-- Name: COLUMN mcs_exposure.mcs_frame_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.mcs_frame_id IS 'MCS frame identifier as generated from Gen2';


--
-- Name: COLUMN mcs_exposure.mcs_exptime; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.mcs_exptime IS 'The exposure time for the frame [sec]';


--
-- Name: COLUMN mcs_exposure.altitude; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.altitude IS 'The telescope attitude [deg]';


--
-- Name: COLUMN mcs_exposure.azimuth; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.azimuth IS 'The telescope azimuth [deg]';


--
-- Name: COLUMN mcs_exposure.insrot; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.insrot IS 'The telescope instrument rotation angle [deg]';


--
-- Name: COLUMN mcs_exposure.adc_pa; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.adc_pa IS 'ADC PA at which the exposure started [deg]';


--
-- Name: COLUMN mcs_exposure.dome_temperature; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.dome_temperature IS 'Dome temperature [K]';


--
-- Name: COLUMN mcs_exposure.dome_pressure; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.dome_pressure IS 'Dome pressure [hPa]';


--
-- Name: COLUMN mcs_exposure.dome_humidity; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.dome_humidity IS 'Dome humidity [%]';


--
-- Name: COLUMN mcs_exposure.outside_temperature; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.outside_temperature IS 'Outside temperature [K]';


--
-- Name: COLUMN mcs_exposure.outside_pressure; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.outside_pressure IS 'Outside pressure [hPa]';


--
-- Name: COLUMN mcs_exposure.outside_humidity; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.outside_humidity IS 'Outside humidity [%]';


--
-- Name: COLUMN mcs_exposure.mcs_cover_temperature; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.mcs_cover_temperature IS 'MCS cover panel temperature [degC]';


--
-- Name: COLUMN mcs_exposure.mcs_m1_temperature; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.mcs_m1_temperature IS 'MCS primary mirror temperature [degC]';


--
-- Name: COLUMN mcs_exposure.taken_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.taken_at IS 'The time at which the exposure was taken [YYYY-MM-DDThh-mm-sss]';


--
-- Name: COLUMN mcs_exposure.taken_in_hst_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.mcs_exposure.taken_in_hst_at IS 'The time (in HST) at which the exposure was taken [YYYY-MM-DDThh-mm-sss]';


--
-- Name: obj_type; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obj_type (
    obj_type_id integer NOT NULL,
    obj_type_name character varying,
    obj_type_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.obj_type OWNER TO michitaro;

--
-- Name: obs_fiber; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obs_fiber (
    pfs_visit_id integer NOT NULL,
    cobra_id integer NOT NULL,
    target_id bigint,
    exptime real,
    cum_nexp integer,
    cum_texp real
);


ALTER TABLE public.obs_fiber OWNER TO michitaro;

--
-- Name: obslog_mcs_exposure_note; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obslog_mcs_exposure_note (
    id integer NOT NULL,
    user_id integer,
    mcs_exposure_frame_id integer,
    body character varying NOT NULL
);


ALTER TABLE public.obslog_mcs_exposure_note OWNER TO michitaro;

--
-- Name: obslog_mcs_exposure_note_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.obslog_mcs_exposure_note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.obslog_mcs_exposure_note_id_seq OWNER TO michitaro;

--
-- Name: obslog_mcs_exposure_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.obslog_mcs_exposure_note_id_seq OWNED BY public.obslog_mcs_exposure_note.id;


--
-- Name: obslog_user; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obslog_user (
    id integer NOT NULL,
    account_name character varying NOT NULL
);


ALTER TABLE public.obslog_user OWNER TO michitaro;

--
-- Name: obslog_user_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.obslog_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.obslog_user_id_seq OWNER TO michitaro;

--
-- Name: obslog_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.obslog_user_id_seq OWNED BY public.obslog_user.id;


--
-- Name: obslog_visit_note; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obslog_visit_note (
    id integer NOT NULL,
    user_id integer,
    pfs_visit_id integer,
    body character varying NOT NULL
);


ALTER TABLE public.obslog_visit_note OWNER TO michitaro;

--
-- Name: obslog_visit_note_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.obslog_visit_note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.obslog_visit_note_id_seq OWNER TO michitaro;

--
-- Name: obslog_visit_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.obslog_visit_note_id_seq OWNED BY public.obslog_visit_note.id;


--
-- Name: obslog_visit_set_note; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.obslog_visit_set_note (
    id integer NOT NULL,
    user_id integer,
    visit_set_id integer,
    body character varying NOT NULL
);


ALTER TABLE public.obslog_visit_set_note OWNER TO michitaro;

--
-- Name: obslog_visit_set_note_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.obslog_visit_set_note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.obslog_visit_set_note_id_seq OWNER TO michitaro;

--
-- Name: obslog_visit_set_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.obslog_visit_set_note_id_seq OWNED BY public.obslog_visit_set_note.id;


--
-- Name: pfs_arm; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_arm (
    pfs_visit_id integer NOT NULL,
    calib_set_id integer,
    sky_model_id integer,
    psf_model_id integer,
    flags integer,
    processed_at timestamp without time zone,
    drp2d_version character varying
);


ALTER TABLE public.pfs_arm OWNER TO michitaro;

--
-- Name: pfs_arm_obj; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_arm_obj (
    pfs_visit_id integer NOT NULL,
    cobra_id integer NOT NULL,
    flags integer,
    qa_type_id integer,
    qa_value real
);


ALTER TABLE public.pfs_arm_obj OWNER TO michitaro;

--
-- Name: pfs_config; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_config (
    pfs_config_id integer NOT NULL,
    pfs_design_id bigint,
    visit0 integer,
    ra_center_config double precision,
    dec_center_config double precision,
    pa_config real,
    converg_num_iter integer,
    converg_elapsed_time real,
    alloc_rms_scatter real,
    allocated_at timestamp without time zone,
    was_observed boolean
);


ALTER TABLE public.pfs_config OWNER TO michitaro;

--
-- Name: COLUMN pfs_config.visit0; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.visit0 IS 'The first visit of the set';


--
-- Name: COLUMN pfs_config.ra_center_config; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.ra_center_config IS 'The right ascension of the PFI center [deg]';


--
-- Name: COLUMN pfs_config.dec_center_config; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.dec_center_config IS 'The declination of the PFI center [deg]';


--
-- Name: COLUMN pfs_config.pa_config; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.pa_config IS 'The position angle of the PFI [deg]';


--
-- Name: COLUMN pfs_config.converg_num_iter; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.converg_num_iter IS 'Allocated total number of cobra iterations towards convergence';


--
-- Name: COLUMN pfs_config.converg_elapsed_time; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.converg_elapsed_time IS 'Allocated time for convergence [sec]';


--
-- Name: COLUMN pfs_config.alloc_rms_scatter; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.alloc_rms_scatter IS '[TBW]';


--
-- Name: COLUMN pfs_config.allocated_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.allocated_at IS 'Time at which config was allocated [YYYY-MM-DDhhmmss] (TBC)';


--
-- Name: COLUMN pfs_config.was_observed; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_config.was_observed IS 'True of configuration was observed (XXX relevant?)';


--
-- Name: pfs_config_fiber; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_config_fiber (
    pfs_config_id bigint NOT NULL,
    cobra_id integer NOT NULL,
    target_id bigint,
    pfi_center_final_x_mm real,
    pfi_center_final_y_mm real,
    motor_map_summary character varying,
    config_elapsed_time real,
    is_on_source boolean
);


ALTER TABLE public.pfs_config_fiber OWNER TO michitaro;

--
-- Name: pfs_config_pfs_config_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.pfs_config_pfs_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pfs_config_pfs_config_id_seq OWNER TO michitaro;

--
-- Name: pfs_config_pfs_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.pfs_config_pfs_config_id_seq OWNED BY public.pfs_config.pfs_config_id;


--
-- Name: pfs_design; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_design (
    pfs_design_id bigint NOT NULL,
    tile_id integer,
    ra_center_designed double precision,
    dec_center_designed double precision,
    pa_designed real,
    num_sci_designed integer,
    num_cal_designed integer,
    num_sky_designed integer,
    num_guide_stars integer,
    exptime_tot real,
    exptime_min real,
    ets_version character varying,
    ets_assigner character varying,
    designed_at timestamp without time zone,
    to_be_observed_at timestamp without time zone,
    is_obsolete boolean
);


ALTER TABLE public.pfs_design OWNER TO michitaro;

--
-- Name: pfs_design_fiber; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_design_fiber (
    pfs_design_id bigint NOT NULL,
    cobra_id integer NOT NULL,
    target_id bigint,
    pfi_target_x_mm real,
    pfi_target_y_mm real,
    ets_priority integer,
    ets_cost_function double precision,
    ets_cobra_motor_movement character varying,
    is_on_source boolean
);


ALTER TABLE public.pfs_design_fiber OWNER TO michitaro;

--
-- Name: COLUMN pfs_design_fiber.pfi_target_x_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_design_fiber.pfi_target_x_mm IS 'Target x-position on the PFI [mm]';


--
-- Name: COLUMN pfs_design_fiber.pfi_target_y_mm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_design_fiber.pfi_target_y_mm IS 'Target y-position on the PFI [mm]';


--
-- Name: pfs_object; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_object (
    pfs_object_id bigint NOT NULL,
    target_id bigint,
    tract integer,
    patch character varying,
    cat_id integer,
    obj_id bigint,
    n_visit integer,
    pfs_visit_hash bigint,
    cum_texp real,
    processed_at timestamp without time zone,
    drp2d_version character varying,
    flux_calib_id integer,
    flags integer,
    qa_type_id integer,
    qa_value real
);


ALTER TABLE public.pfs_object OWNER TO michitaro;

--
-- Name: pfs_object_pfs_object_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.pfs_object_pfs_object_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pfs_object_pfs_object_id_seq OWNER TO michitaro;

--
-- Name: pfs_object_pfs_object_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.pfs_object_pfs_object_id_seq OWNED BY public.pfs_object.pfs_object_id;


--
-- Name: pfs_visit; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.pfs_visit (
    pfs_visit_id integer NOT NULL,
    pfs_visit_description character varying,
    pfs_design_id bigint,
    issued_at timestamp without time zone
);


ALTER TABLE public.pfs_visit OWNER TO michitaro;

--
-- Name: COLUMN pfs_visit.issued_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.pfs_visit.issued_at IS 'Issued time [YYYY-MM-DDThh:mm:ss]';


--
-- Name: processing_status; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.processing_status (
    status_id integer NOT NULL,
    visit_set_id integer,
    pfs_visit_id integer,
    are_data_ok boolean,
    comments character varying,
    drp2d_version character varying,
    qa_version character varying
);


ALTER TABLE public.processing_status OWNER TO michitaro;

--
-- Name: COLUMN processing_status.status_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.processing_status.status_id IS 'Unique processing status identifier';


--
-- Name: COLUMN processing_status.are_data_ok; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.processing_status.are_data_ok IS 'The result of the quality assessment';


--
-- Name: COLUMN processing_status.comments; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.processing_status.comments IS 'Detailed comments on the QA results';


--
-- Name: COLUMN processing_status.drp2d_version; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.processing_status.drp2d_version IS '2D-DRP version used in the processing';


--
-- Name: COLUMN processing_status.qa_version; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.processing_status.qa_version IS 'QA version used in the processing (TBD)';


--
-- Name: program; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.program (
    program_id integer NOT NULL,
    program_name character varying,
    program_description character varying,
    proposal_id character varying,
    is_filler boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.program OWNER TO michitaro;

--
-- Name: COLUMN program.program_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.program.program_id IS 'Unique program identifier';


--
-- Name: proposal; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.proposal (
    proposal_id character varying NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.proposal OWNER TO michitaro;

--
-- Name: COLUMN proposal.proposal_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.proposal.proposal_id IS 'Unique identifier for proposal';


--
-- Name: COLUMN proposal.created_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.proposal.created_at IS 'Creation time [YYYY-MM-DDThh:mm:ss]';


--
-- Name: COLUMN proposal.updated_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.proposal.updated_at IS 'Update time [YYYY-MM-DDThh:mm:ss]';


--
-- Name: psf_model; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.psf_model (
    psf_model_id integer NOT NULL,
    pfs_visit_id integer,
    tel_visit_id integer,
    sps_camera_id integer
);


ALTER TABLE public.psf_model OWNER TO michitaro;

--
-- Name: qa_type; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.qa_type (
    qa_type_id integer NOT NULL,
    qa_type_name character varying,
    qa_type_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.qa_type OWNER TO michitaro;

--
-- Name: sky_model; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sky_model (
    sky_model_id integer NOT NULL,
    pfs_visit_id integer,
    tel_visit_id integer,
    sps_camera_id integer
);


ALTER TABLE public.sky_model OWNER TO michitaro;

--
-- Name: sps_annotation_annotation_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.sps_annotation_annotation_id_seq
    START WITH 6
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sps_annotation_annotation_id_seq OWNER TO michitaro;

--
-- Name: sps_annotation; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_annotation (
    pfs_visit_id integer,
    sps_camera_id integer,
    data_flag integer,
    notes character varying,
    annotation_id integer DEFAULT nextval('public.sps_annotation_annotation_id_seq'::regclass) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.sps_annotation OWNER TO michitaro;

--
-- Name: COLUMN sps_annotation.pfs_visit_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.pfs_visit_id IS 'PFS visit identifier';


--
-- Name: COLUMN sps_annotation.sps_camera_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.sps_camera_id IS 'SpS camera identifier [1-16]';


--
-- Name: COLUMN sps_annotation.data_flag; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.data_flag IS 'Flag of obtained data';


--
-- Name: COLUMN sps_annotation.notes; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.notes IS 'Notes of obtained data';


--
-- Name: COLUMN sps_annotation.annotation_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.annotation_id IS 'SpS annotation identifier (primary key)';


--
-- Name: COLUMN sps_annotation.created_at; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_annotation.created_at IS 'Creation time [YYYY-MM-DDThh:mm:ss]';


--
-- Name: sps_camera; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_camera (
    sps_camera_id integer NOT NULL,
    sps_module_id integer,
    arm character varying(1),
    arm_num integer
);


ALTER TABLE public.sps_camera OWNER TO michitaro;

--
-- Name: COLUMN sps_camera.sps_camera_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_camera.sps_camera_id IS 'SpS camera identifier [1-16]';


--
-- Name: COLUMN sps_camera.sps_module_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_camera.sps_module_id IS 'SpS module identifier [1-4]';


--
-- Name: COLUMN sps_camera.arm; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_camera.arm IS 'Spectrograph arm identifier [b, r, n, m]';


--
-- Name: COLUMN sps_camera.arm_num; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_camera.arm_num IS 'Spectrograph arm identifier as a number [1-4]';


--
-- Name: sps_condition; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_condition (
    pfs_visit_id integer NOT NULL,
    sps_camera_id integer NOT NULL,
    background real,
    throughput real
);


ALTER TABLE public.sps_condition OWNER TO michitaro;

--
-- Name: COLUMN sps_condition.pfs_visit_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_condition.pfs_visit_id IS 'PFS visit identifier';


--
-- Name: COLUMN sps_condition.sps_camera_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_condition.sps_camera_id IS 'SpS camera identifier [1-16]';


--
-- Name: COLUMN sps_condition.background; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_condition.background IS 'Background level (TBD)';


--
-- Name: COLUMN sps_condition.throughput; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_condition.throughput IS 'System throughput (TBD)';


--
-- Name: sps_exposure; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_exposure (
    pfs_visit_id integer NOT NULL,
    sps_camera_id integer NOT NULL,
    exptime real,
    time_exp_start timestamp without time zone,
    time_exp_end timestamp without time zone,
    beam_config_date double precision
);


ALTER TABLE public.sps_exposure OWNER TO michitaro;

--
-- Name: COLUMN sps_exposure.pfs_visit_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.pfs_visit_id IS 'PFS visit identifier';


--
-- Name: COLUMN sps_exposure.sps_camera_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.sps_camera_id IS 'SpS camera identifier [1-16]';


--
-- Name: COLUMN sps_exposure.exptime; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.exptime IS 'Exposure time for visit [sec]';


--
-- Name: COLUMN sps_exposure.time_exp_start; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.time_exp_start IS 'Start time for exposure [YYYY-MM-DDThh:mm:ss]';


--
-- Name: COLUMN sps_exposure.time_exp_end; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.time_exp_end IS 'End time for exposure [YYYY-MM-DDThh:mm:ss]';


--
-- Name: COLUMN sps_exposure.beam_config_date; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_exposure.beam_config_date IS 'MJD when the configuration changed';


--
-- Name: sps_module; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_module (
    sps_module_id integer NOT NULL,
    description character varying
);


ALTER TABLE public.sps_module OWNER TO michitaro;

--
-- Name: COLUMN sps_module.sps_module_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_module.sps_module_id IS 'SpS module identifier [1-4]';


--
-- Name: COLUMN sps_module.description; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_module.description IS 'SpS module name';


--
-- Name: sps_sequence; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_sequence (
    visit_set_id integer NOT NULL,
    sequence_type character varying,
    name character varying,
    comments character varying,
    cmd_str character varying,
    status character varying
);


ALTER TABLE public.sps_sequence OWNER TO michitaro;

--
-- Name: COLUMN sps_sequence.visit_set_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.visit_set_id IS 'SpS visit set identifier';


--
-- Name: COLUMN sps_sequence.sequence_type; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.sequence_type IS 'SpS sequence type';


--
-- Name: COLUMN sps_sequence.name; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.name IS 'The unique name assigned to this set of visits';


--
-- Name: COLUMN sps_sequence.comments; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.comments IS 'Comments for the sequence';


--
-- Name: COLUMN sps_sequence.cmd_str; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.cmd_str IS 'ICS command string that generates exposures for this set of visits';


--
-- Name: COLUMN sps_sequence.status; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_sequence.status IS 'Status of the sequence';


--
-- Name: sps_visit; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.sps_visit (
    pfs_visit_id integer NOT NULL,
    exp_type character varying
);


ALTER TABLE public.sps_visit OWNER TO michitaro;

--
-- Name: COLUMN sps_visit.pfs_visit_id; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_visit.pfs_visit_id IS 'PFS visit identifier';


--
-- Name: COLUMN sps_visit.exp_type; Type: COMMENT; Schema: public; Owner: michitaro
--

COMMENT ON COLUMN public.sps_visit.exp_type IS 'Type of exposure: BIAS, FLAT, DFLAT etc.';


--
-- Name: star_type; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.star_type (
    star_type_id integer NOT NULL,
    star_type_name character varying,
    star_type_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.star_type OWNER TO michitaro;

--
-- Name: target; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.target (
    target_id bigint NOT NULL,
    program_id integer,
    obj_id bigint,
    ra double precision,
    decl double precision,
    tract integer,
    patch character varying,
    priority real,
    target_type_id integer,
    cat_id integer,
    cat_obj_id bigint,
    fiber_mag_g real,
    fiber_mag_r real,
    fiber_mag_i real,
    fiber_mag_z real,
    fiber_mag_y real,
    fiber_mag_j real,
    fiducial_exptime real,
    photz real,
    is_medium_resolution boolean,
    qa_type_id integer,
    qa_lambda_min real,
    qa_lambda_max real,
    qa_threshold real,
    qa_line_flux real,
    completeness real,
    is_finished boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.target OWNER TO michitaro;

--
-- Name: target_target_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.target_target_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.target_target_id_seq OWNER TO michitaro;

--
-- Name: target_target_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.target_target_id_seq OWNED BY public.target.target_id;


--
-- Name: target_type; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.target_type (
    target_type_id integer NOT NULL,
    target_type_name character varying,
    target_type_description character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.target_type OWNER TO michitaro;

--
-- Name: tel_condition; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.tel_condition (
    tel_visit_id integer NOT NULL,
    focusing_error real,
    guide_error_sigma_arcsec real,
    airmass real,
    moon_phase real,
    moon_alt real,
    moon_sep real,
    seeing real,
    transp real,
    cloud_condition_id integer
);


ALTER TABLE public.tel_condition OWNER TO michitaro;

--
-- Name: tel_visit; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.tel_visit (
    tel_visit_id integer NOT NULL,
    pfs_config_id bigint,
    ra_tel real,
    dec_tel real,
    beam_switch_mode_id integer,
    beam_switch_offset_ra real,
    beam_switch_offset_dec real
);


ALTER TABLE public.tel_visit OWNER TO michitaro;

--
-- Name: test; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.test (
    id integer,
    value real
);


ALTER TABLE public.test OWNER TO michitaro;

--
-- Name: tile; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.tile (
    tile_id integer NOT NULL,
    program_id integer,
    tile integer,
    ra_center double precision,
    dec_center double precision,
    pa real,
    is_finished boolean
);


ALTER TABLE public.tile OWNER TO michitaro;

--
-- Name: tile_tile_id_seq; Type: SEQUENCE; Schema: public; Owner: michitaro
--

CREATE SEQUENCE public.tile_tile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tile_tile_id_seq OWNER TO michitaro;

--
-- Name: tile_tile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: michitaro
--

ALTER SEQUENCE public.tile_tile_id_seq OWNED BY public.tile.tile_id;


--
-- Name: visit_hash; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.visit_hash (
    pfs_visit_hash bigint NOT NULL,
    n_visit integer
);


ALTER TABLE public.visit_hash OWNER TO michitaro;

--
-- Name: visit_set; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.visit_set (
    pfs_visit_id integer NOT NULL,
    visit_set_id integer
);


ALTER TABLE public.visit_set OWNER TO michitaro;

--
-- Name: visits_to_combine; Type: TABLE; Schema: public; Owner: michitaro
--

CREATE TABLE public.visits_to_combine (
    pfs_visit_hash bigint NOT NULL,
    pfs_visit_id integer NOT NULL
);


ALTER TABLE public.visits_to_combine OWNER TO michitaro;

--
-- Name: calib calib_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib ALTER COLUMN calib_id SET DEFAULT nextval('public.calib_calib_id_seq'::regclass);


--
-- Name: calib_set calib_set_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set ALTER COLUMN calib_set_id SET DEFAULT nextval('public.calib_set_calib_set_id_seq'::regclass);


--
-- Name: cobra_motor_calib cobra_motor_calib_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_calib ALTER COLUMN cobra_motor_calib_id SET DEFAULT nextval('public.cobra_motor_calib_cobra_motor_calib_id_seq'::regclass);


--
-- Name: cobra_motor_model cobra_motor_model_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_model ALTER COLUMN cobra_motor_model_id SET DEFAULT nextval('public.cobra_motor_model_cobra_motor_model_id_seq'::regclass);


--
-- Name: obslog_mcs_exposure_note id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_mcs_exposure_note ALTER COLUMN id SET DEFAULT nextval('public.obslog_mcs_exposure_note_id_seq'::regclass);


--
-- Name: obslog_user id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_user ALTER COLUMN id SET DEFAULT nextval('public.obslog_user_id_seq'::regclass);


--
-- Name: obslog_visit_note id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_note ALTER COLUMN id SET DEFAULT nextval('public.obslog_visit_note_id_seq'::regclass);


--
-- Name: obslog_visit_set_note id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_set_note ALTER COLUMN id SET DEFAULT nextval('public.obslog_visit_set_note_id_seq'::regclass);


--
-- Name: pfs_config pfs_config_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config ALTER COLUMN pfs_config_id SET DEFAULT nextval('public.pfs_config_pfs_config_id_seq'::regclass);


--
-- Name: pfs_object pfs_object_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object ALTER COLUMN pfs_object_id SET DEFAULT nextval('public.pfs_object_pfs_object_id_seq'::regclass);


--
-- Name: target target_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target ALTER COLUMN target_id SET DEFAULT nextval('public.target_target_id_seq'::regclass);


--
-- Name: tile tile_id; Type: DEFAULT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tile ALTER COLUMN tile_id SET DEFAULT nextval('public.tile_tile_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: beam_switch_mode beam_switch_mode_beam_switch_mode_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.beam_switch_mode
    ADD CONSTRAINT beam_switch_mode_beam_switch_mode_id_key UNIQUE (beam_switch_mode_id);


--
-- Name: beam_switch_mode beam_switch_mode_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.beam_switch_mode
    ADD CONSTRAINT beam_switch_mode_pkey PRIMARY KEY (beam_switch_mode_id);


--
-- Name: calib calib_calib_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib
    ADD CONSTRAINT calib_calib_id_key UNIQUE (calib_id);


--
-- Name: calib calib_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib
    ADD CONSTRAINT calib_pkey PRIMARY KEY (calib_id);


--
-- Name: calib_set calib_set_calib_set_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_calib_set_id_key UNIQUE (calib_set_id);


--
-- Name: calib_set calib_set_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_pkey PRIMARY KEY (calib_set_id);


--
-- Name: cloud_condition cloud_condition_cloud_condition_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cloud_condition
    ADD CONSTRAINT cloud_condition_cloud_condition_id_key UNIQUE (cloud_condition_id);


--
-- Name: cloud_condition cloud_condition_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cloud_condition
    ADD CONSTRAINT cloud_condition_pkey PRIMARY KEY (cloud_condition_id);


--
-- Name: cobra cobra_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra
    ADD CONSTRAINT cobra_cobra_id_key UNIQUE (cobra_id);


--
-- Name: cobra_convergence_test cobra_convergence_test_cobra_motor_model_id_iteration_cobra_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_convergence_test
    ADD CONSTRAINT cobra_convergence_test_cobra_motor_model_id_iteration_cobra_key UNIQUE (cobra_motor_model_id, iteration, cobra_motor_angle_target_id);


--
-- Name: cobra_convergence_test cobra_convergence_test_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_convergence_test
    ADD CONSTRAINT cobra_convergence_test_pkey PRIMARY KEY (cobra_motor_model_id, iteration, cobra_motor_angle_target_id);


--
-- Name: cobra_geometry cobra_geometry_cobra_motor_calib_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_geometry
    ADD CONSTRAINT cobra_geometry_cobra_motor_calib_id_cobra_id_key UNIQUE (cobra_motor_calib_id, cobra_id);


--
-- Name: cobra_geometry cobra_geometry_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_geometry
    ADD CONSTRAINT cobra_geometry_pkey PRIMARY KEY (cobra_motor_calib_id, cobra_id);


--
-- Name: cobra_motor_axis cobra_motor_axis_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_axis
    ADD CONSTRAINT cobra_motor_axis_pkey PRIMARY KEY (cobra_motor_axis_id);


--
-- Name: cobra_motor_calib cobra_motor_calib_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_calib
    ADD CONSTRAINT cobra_motor_calib_pkey PRIMARY KEY (cobra_motor_calib_id);


--
-- Name: cobra_motor_direction cobra_motor_direction_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_direction
    ADD CONSTRAINT cobra_motor_direction_pkey PRIMARY KEY (cobra_motor_direction_id);


--
-- Name: cobra_motor_map cobra_motor_map_cobra_motor_model_id_cobra_motor_move_seque_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_map
    ADD CONSTRAINT cobra_motor_map_cobra_motor_model_id_cobra_motor_move_seque_key UNIQUE (cobra_motor_model_id, cobra_motor_move_sequence);


--
-- Name: cobra_motor_map cobra_motor_map_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_map
    ADD CONSTRAINT cobra_motor_map_pkey PRIMARY KEY (cobra_motor_model_id, cobra_motor_move_sequence);


--
-- Name: cobra_motor_model cobra_motor_model_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_model
    ADD CONSTRAINT cobra_motor_model_pkey PRIMARY KEY (cobra_motor_model_id);


--
-- Name: cobra_movement cobra_movement_mcs_frame_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_movement
    ADD CONSTRAINT cobra_movement_mcs_frame_id_cobra_id_key UNIQUE (mcs_frame_id, cobra_id);


--
-- Name: cobra_movement cobra_movement_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_movement
    ADD CONSTRAINT cobra_movement_pkey PRIMARY KEY (mcs_frame_id, cobra_id);


--
-- Name: cobra cobra_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra
    ADD CONSTRAINT cobra_pkey PRIMARY KEY (cobra_id);


--
-- Name: cobra_status cobra_status_mcs_frame_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_status
    ADD CONSTRAINT cobra_status_mcs_frame_id_cobra_id_key UNIQUE (mcs_frame_id, cobra_id);


--
-- Name: cobra_status cobra_status_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_status
    ADD CONSTRAINT cobra_status_pkey PRIMARY KEY (mcs_frame_id, cobra_id);


--
-- Name: drp1d_line drp1d_line_pfs_object_id_processed_at_line_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_line
    ADD CONSTRAINT drp1d_line_pfs_object_id_processed_at_line_id_key UNIQUE (pfs_object_id, processed_at, line_id);


--
-- Name: drp1d_line drp1d_line_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_line
    ADD CONSTRAINT drp1d_line_pkey PRIMARY KEY (pfs_object_id, line_id, processed_at);


--
-- Name: drp1d drp1d_pfs_object_id_processed_at_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d
    ADD CONSTRAINT drp1d_pfs_object_id_processed_at_key UNIQUE (pfs_object_id, processed_at);


--
-- Name: drp1d drp1d_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d
    ADD CONSTRAINT drp1d_pkey PRIMARY KEY (pfs_object_id, processed_at);


--
-- Name: drp1d_redshift drp1d_redshift_pfs_object_id_processed_at_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_redshift
    ADD CONSTRAINT drp1d_redshift_pfs_object_id_processed_at_key UNIQUE (pfs_object_id, processed_at);


--
-- Name: drp1d_redshift drp1d_redshift_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_redshift
    ADD CONSTRAINT drp1d_redshift_pkey PRIMARY KEY (pfs_object_id, processed_at);


--
-- Name: drp_ga drp_ga_pfs_object_id_processed_at_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp_ga
    ADD CONSTRAINT drp_ga_pfs_object_id_processed_at_key UNIQUE (pfs_object_id, processed_at);


--
-- Name: drp_ga drp_ga_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp_ga
    ADD CONSTRAINT drp_ga_pkey PRIMARY KEY (pfs_object_id, processed_at);


--
-- Name: fiducial_fiber_geometry fiducial_fiber_geometry_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.fiducial_fiber_geometry
    ADD CONSTRAINT fiducial_fiber_geometry_pkey PRIMARY KEY (fiducial_fiber_id);


--
-- Name: fiducial_fiber fiducial_fiber_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.fiducial_fiber
    ADD CONSTRAINT fiducial_fiber_pkey PRIMARY KEY (fiducial_fiber_id);


--
-- Name: flux_calib flux_calib_flux_calib_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.flux_calib
    ADD CONSTRAINT flux_calib_flux_calib_id_key UNIQUE (flux_calib_id);


--
-- Name: flux_calib flux_calib_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.flux_calib
    ADD CONSTRAINT flux_calib_pkey PRIMARY KEY (flux_calib_id);


--
-- Name: guide_stars guide_stars_guide_star_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.guide_stars
    ADD CONSTRAINT guide_stars_guide_star_id_key UNIQUE (guide_star_id);


--
-- Name: guide_stars guide_stars_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.guide_stars
    ADD CONSTRAINT guide_stars_pkey PRIMARY KEY (guide_star_id);


--
-- Name: input_catalog input_catalog_cat_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.input_catalog
    ADD CONSTRAINT input_catalog_cat_id_key UNIQUE (cat_id);


--
-- Name: input_catalog input_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.input_catalog
    ADD CONSTRAINT input_catalog_pkey PRIMARY KEY (cat_id);


--
-- Name: line_list line_list_line_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.line_list
    ADD CONSTRAINT line_list_line_id_key UNIQUE (line_id);


--
-- Name: line_list line_list_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.line_list
    ADD CONSTRAINT line_list_pkey PRIMARY KEY (line_id);


--
-- Name: mcs_boresight mcs_boresight_pfs_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_boresight
    ADD CONSTRAINT mcs_boresight_pfs_visit_id_key UNIQUE (pfs_visit_id);


--
-- Name: mcs_boresight mcs_boresight_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_boresight
    ADD CONSTRAINT mcs_boresight_pkey PRIMARY KEY (pfs_visit_id);


--
-- Name: mcs_data mcs_data_mcs_frame_id_spot_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_data
    ADD CONSTRAINT mcs_data_mcs_frame_id_spot_id_key UNIQUE (mcs_frame_id, spot_id);


--
-- Name: mcs_data mcs_data_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_data
    ADD CONSTRAINT mcs_data_pkey PRIMARY KEY (mcs_frame_id, spot_id);


--
-- Name: mcs_exposure mcs_exposure_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_exposure
    ADD CONSTRAINT mcs_exposure_pkey PRIMARY KEY (mcs_frame_id);


--
-- Name: obj_type obj_type_obj_type_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obj_type
    ADD CONSTRAINT obj_type_obj_type_id_key UNIQUE (obj_type_id);


--
-- Name: obj_type obj_type_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obj_type
    ADD CONSTRAINT obj_type_pkey PRIMARY KEY (obj_type_id);


--
-- Name: obs_fiber obs_fiber_pfs_visit_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obs_fiber
    ADD CONSTRAINT obs_fiber_pfs_visit_id_cobra_id_key UNIQUE (pfs_visit_id, cobra_id);


--
-- Name: obs_fiber obs_fiber_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obs_fiber
    ADD CONSTRAINT obs_fiber_pkey PRIMARY KEY (pfs_visit_id, cobra_id);


--
-- Name: obslog_mcs_exposure_note obslog_mcs_exposure_note_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_mcs_exposure_note
    ADD CONSTRAINT obslog_mcs_exposure_note_pkey PRIMARY KEY (id);


--
-- Name: obslog_user obslog_user_account_name_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_user
    ADD CONSTRAINT obslog_user_account_name_key UNIQUE (account_name);


--
-- Name: obslog_user obslog_user_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_user
    ADD CONSTRAINT obslog_user_pkey PRIMARY KEY (id);


--
-- Name: obslog_visit_note obslog_visit_note_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_note
    ADD CONSTRAINT obslog_visit_note_pkey PRIMARY KEY (id);


--
-- Name: obslog_visit_set_note obslog_visit_set_note_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_set_note
    ADD CONSTRAINT obslog_visit_set_note_pkey PRIMARY KEY (id);


--
-- Name: pfs_arm_obj pfs_arm_obj_pfs_visit_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm_obj
    ADD CONSTRAINT pfs_arm_obj_pfs_visit_id_cobra_id_key UNIQUE (pfs_visit_id, cobra_id);


--
-- Name: pfs_arm_obj pfs_arm_obj_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm_obj
    ADD CONSTRAINT pfs_arm_obj_pkey PRIMARY KEY (pfs_visit_id, cobra_id);


--
-- Name: pfs_arm pfs_arm_pfs_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_pfs_visit_id_key UNIQUE (pfs_visit_id);


--
-- Name: pfs_arm pfs_arm_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_pkey PRIMARY KEY (pfs_visit_id);


--
-- Name: pfs_config_fiber pfs_config_fiber_pfs_config_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config_fiber
    ADD CONSTRAINT pfs_config_fiber_pfs_config_id_cobra_id_key UNIQUE (pfs_config_id, cobra_id);


--
-- Name: pfs_config_fiber pfs_config_fiber_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config_fiber
    ADD CONSTRAINT pfs_config_fiber_pkey PRIMARY KEY (pfs_config_id, cobra_id);


--
-- Name: pfs_config pfs_config_pfs_config_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config
    ADD CONSTRAINT pfs_config_pfs_config_id_key UNIQUE (pfs_config_id);


--
-- Name: pfs_config pfs_config_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config
    ADD CONSTRAINT pfs_config_pkey PRIMARY KEY (pfs_config_id);


--
-- Name: pfs_design_fiber pfs_design_fiber_pfs_design_id_cobra_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design_fiber
    ADD CONSTRAINT pfs_design_fiber_pfs_design_id_cobra_id_key UNIQUE (pfs_design_id, cobra_id);


--
-- Name: pfs_design_fiber pfs_design_fiber_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design_fiber
    ADD CONSTRAINT pfs_design_fiber_pkey PRIMARY KEY (pfs_design_id, cobra_id);


--
-- Name: pfs_design pfs_design_pfs_design_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design
    ADD CONSTRAINT pfs_design_pfs_design_id_key UNIQUE (pfs_design_id);


--
-- Name: pfs_design pfs_design_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design
    ADD CONSTRAINT pfs_design_pkey PRIMARY KEY (pfs_design_id);


--
-- Name: pfs_object pfs_object_pfs_object_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_pfs_object_id_key UNIQUE (pfs_object_id);


--
-- Name: pfs_object pfs_object_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_pkey PRIMARY KEY (pfs_object_id);


--
-- Name: pfs_visit pfs_visit_pfs_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_visit
    ADD CONSTRAINT pfs_visit_pfs_visit_id_key UNIQUE (pfs_visit_id);


--
-- Name: pfs_visit pfs_visit_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_visit
    ADD CONSTRAINT pfs_visit_pkey PRIMARY KEY (pfs_visit_id);


--
-- Name: processing_status processing_status_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.processing_status
    ADD CONSTRAINT processing_status_pkey PRIMARY KEY (status_id);


--
-- Name: program program_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_pkey PRIMARY KEY (program_id);


--
-- Name: program program_program_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_program_id_key UNIQUE (program_id);


--
-- Name: proposal proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.proposal
    ADD CONSTRAINT proposal_pkey PRIMARY KEY (proposal_id);


--
-- Name: proposal proposal_proposal_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.proposal
    ADD CONSTRAINT proposal_proposal_id_key UNIQUE (proposal_id);


--
-- Name: psf_model psf_model_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.psf_model
    ADD CONSTRAINT psf_model_pkey PRIMARY KEY (psf_model_id);


--
-- Name: psf_model psf_model_psf_model_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.psf_model
    ADD CONSTRAINT psf_model_psf_model_id_key UNIQUE (psf_model_id);


--
-- Name: qa_type qa_type_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.qa_type
    ADD CONSTRAINT qa_type_pkey PRIMARY KEY (qa_type_id);


--
-- Name: qa_type qa_type_qa_type_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.qa_type
    ADD CONSTRAINT qa_type_qa_type_id_key UNIQUE (qa_type_id);


--
-- Name: sky_model sky_model_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sky_model
    ADD CONSTRAINT sky_model_pkey PRIMARY KEY (sky_model_id);


--
-- Name: sky_model sky_model_sky_model_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sky_model
    ADD CONSTRAINT sky_model_sky_model_id_key UNIQUE (sky_model_id);


--
-- Name: sps_annotation sps_annotation_annotation_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_annotation
    ADD CONSTRAINT sps_annotation_annotation_id_key UNIQUE (annotation_id);


--
-- Name: sps_annotation sps_annotation_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_annotation
    ADD CONSTRAINT sps_annotation_pkey PRIMARY KEY (annotation_id);


--
-- Name: sps_camera sps_camera_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_camera
    ADD CONSTRAINT sps_camera_pkey PRIMARY KEY (sps_camera_id);


--
-- Name: sps_condition sps_condition_pfs_visit_id_sps_camera_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_condition
    ADD CONSTRAINT sps_condition_pfs_visit_id_sps_camera_id_key UNIQUE (pfs_visit_id, sps_camera_id);


--
-- Name: sps_condition sps_condition_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_condition
    ADD CONSTRAINT sps_condition_pkey PRIMARY KEY (pfs_visit_id, sps_camera_id);


--
-- Name: sps_exposure sps_exposure_pfs_visit_id_sps_camera_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_exposure
    ADD CONSTRAINT sps_exposure_pfs_visit_id_sps_camera_id_key UNIQUE (pfs_visit_id, sps_camera_id);


--
-- Name: sps_exposure sps_exposure_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_exposure
    ADD CONSTRAINT sps_exposure_pkey PRIMARY KEY (pfs_visit_id, sps_camera_id);


--
-- Name: sps_module sps_module_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_module
    ADD CONSTRAINT sps_module_pkey PRIMARY KEY (sps_module_id);


--
-- Name: sps_module sps_module_sps_module_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_module
    ADD CONSTRAINT sps_module_sps_module_id_key UNIQUE (sps_module_id);


--
-- Name: sps_sequence sps_sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_sequence
    ADD CONSTRAINT sps_sequence_pkey PRIMARY KEY (visit_set_id);


--
-- Name: sps_sequence sps_sequence_visit_set_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_sequence
    ADD CONSTRAINT sps_sequence_visit_set_id_key UNIQUE (visit_set_id);


--
-- Name: sps_visit sps_visit_pfs_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_visit
    ADD CONSTRAINT sps_visit_pfs_visit_id_key UNIQUE (pfs_visit_id);


--
-- Name: sps_visit sps_visit_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_visit
    ADD CONSTRAINT sps_visit_pkey PRIMARY KEY (pfs_visit_id);


--
-- Name: star_type star_type_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.star_type
    ADD CONSTRAINT star_type_pkey PRIMARY KEY (star_type_id);


--
-- Name: star_type star_type_star_type_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.star_type
    ADD CONSTRAINT star_type_star_type_id_key UNIQUE (star_type_id);


--
-- Name: target target_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_pkey PRIMARY KEY (target_id);


--
-- Name: target target_target_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_target_id_key UNIQUE (target_id);


--
-- Name: target_type target_type_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target_type
    ADD CONSTRAINT target_type_pkey PRIMARY KEY (target_type_id);


--
-- Name: target_type target_type_target_type_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target_type
    ADD CONSTRAINT target_type_target_type_id_key UNIQUE (target_type_id);


--
-- Name: tel_condition tel_condition_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_condition
    ADD CONSTRAINT tel_condition_pkey PRIMARY KEY (tel_visit_id);


--
-- Name: tel_condition tel_condition_tel_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_condition
    ADD CONSTRAINT tel_condition_tel_visit_id_key UNIQUE (tel_visit_id);


--
-- Name: tel_visit tel_visit_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_visit
    ADD CONSTRAINT tel_visit_pkey PRIMARY KEY (tel_visit_id);


--
-- Name: tile tile_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tile
    ADD CONSTRAINT tile_pkey PRIMARY KEY (tile_id);


--
-- Name: tile tile_tile_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tile
    ADD CONSTRAINT tile_tile_id_key UNIQUE (tile_id);


--
-- Name: visit_hash visit_hash_pfs_visit_hash_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_hash
    ADD CONSTRAINT visit_hash_pfs_visit_hash_key UNIQUE (pfs_visit_hash);


--
-- Name: visit_hash visit_hash_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_hash
    ADD CONSTRAINT visit_hash_pkey PRIMARY KEY (pfs_visit_hash);


--
-- Name: visit_set visit_set_pfs_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_set
    ADD CONSTRAINT visit_set_pfs_visit_id_key UNIQUE (pfs_visit_id);


--
-- Name: visit_set visit_set_pkey; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_set
    ADD CONSTRAINT visit_set_pkey PRIMARY KEY (pfs_visit_id);


--
-- Name: visits_to_combine visits_to_combine_pfs_visit_id_pfs_visit_hash_key; Type: CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visits_to_combine
    ADD CONSTRAINT visits_to_combine_pfs_visit_id_pfs_visit_hash_key UNIQUE (pfs_visit_id, pfs_visit_hash);


--
-- Name: ix_cobra_motor_model_cobra_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_motor_model_cobra_id ON public.cobra_motor_model USING btree (cobra_id);


--
-- Name: ix_cobra_motor_model_cobra_motor_axis_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_motor_model_cobra_motor_axis_id ON public.cobra_motor_model USING btree (cobra_motor_axis_id);


--
-- Name: ix_cobra_motor_model_cobra_motor_calib_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_motor_model_cobra_motor_calib_id ON public.cobra_motor_model USING btree (cobra_motor_calib_id);


--
-- Name: ix_cobra_motor_model_cobra_motor_direction_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_motor_model_cobra_motor_direction_id ON public.cobra_motor_model USING btree (cobra_motor_direction_id);


--
-- Name: ix_cobra_movement_mcs_frame_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_movement_mcs_frame_id ON public.cobra_movement USING btree (mcs_frame_id);


--
-- Name: ix_cobra_status_mcs_frame_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_cobra_status_mcs_frame_id ON public.cobra_status USING btree (mcs_frame_id);


--
-- Name: ix_mcs_data_mcs_frame_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE INDEX ix_mcs_data_mcs_frame_id ON public.mcs_data USING btree (mcs_frame_id);


--
-- Name: ix_mcs_exposure_mcs_frame_id; Type: INDEX; Schema: public; Owner: michitaro
--

CREATE UNIQUE INDEX ix_mcs_exposure_mcs_frame_id ON public.mcs_exposure USING btree (mcs_frame_id);


--
-- Name: calib calib_pfs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib
    ADD CONSTRAINT calib_pfs_config_id_fkey FOREIGN KEY (pfs_config_id) REFERENCES public.pfs_config(pfs_config_id);


--
-- Name: calib_set calib_set_calib_arcs_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_calib_arcs_id_fkey FOREIGN KEY (calib_arcs_id) REFERENCES public.calib(calib_id);


--
-- Name: calib_set calib_set_calib_bias_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_calib_bias_id_fkey FOREIGN KEY (calib_bias_id) REFERENCES public.calib(calib_id);


--
-- Name: calib_set calib_set_calib_dark_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_calib_dark_id_fkey FOREIGN KEY (calib_dark_id) REFERENCES public.calib(calib_id);


--
-- Name: calib_set calib_set_calib_flat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.calib_set
    ADD CONSTRAINT calib_set_calib_flat_id_fkey FOREIGN KEY (calib_flat_id) REFERENCES public.calib(calib_id);


--
-- Name: cobra_convergence_test cobra_convergence_test_cobra_motor_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_convergence_test
    ADD CONSTRAINT cobra_convergence_test_cobra_motor_model_id_fkey FOREIGN KEY (cobra_motor_model_id) REFERENCES public.cobra_motor_model(cobra_motor_model_id);


--
-- Name: cobra_geometry cobra_geometry_cobra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_geometry
    ADD CONSTRAINT cobra_geometry_cobra_id_fkey FOREIGN KEY (cobra_id) REFERENCES public.cobra(cobra_id);


--
-- Name: cobra_geometry cobra_geometry_cobra_motor_calib_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_geometry
    ADD CONSTRAINT cobra_geometry_cobra_motor_calib_id_fkey FOREIGN KEY (cobra_motor_calib_id) REFERENCES public.cobra_motor_calib(cobra_motor_calib_id);


--
-- Name: cobra_motor_map cobra_motor_map_cobra_motor_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_map
    ADD CONSTRAINT cobra_motor_map_cobra_motor_model_id_fkey FOREIGN KEY (cobra_motor_model_id) REFERENCES public.cobra_motor_model(cobra_motor_model_id);


--
-- Name: cobra_motor_model cobra_motor_model_cobra_motor_axis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_model
    ADD CONSTRAINT cobra_motor_model_cobra_motor_axis_id_fkey FOREIGN KEY (cobra_motor_axis_id) REFERENCES public.cobra_motor_axis(cobra_motor_axis_id);


--
-- Name: cobra_motor_model cobra_motor_model_cobra_motor_calib_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_model
    ADD CONSTRAINT cobra_motor_model_cobra_motor_calib_id_fkey FOREIGN KEY (cobra_motor_calib_id) REFERENCES public.cobra_motor_calib(cobra_motor_calib_id);


--
-- Name: cobra_motor_model cobra_motor_model_cobra_motor_direction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_motor_model
    ADD CONSTRAINT cobra_motor_model_cobra_motor_direction_id_fkey FOREIGN KEY (cobra_motor_direction_id) REFERENCES public.cobra_motor_direction(cobra_motor_direction_id);


--
-- Name: cobra_movement cobra_movement_cobra_motor_calib_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_movement
    ADD CONSTRAINT cobra_movement_cobra_motor_calib_id_fkey FOREIGN KEY (cobra_motor_calib_id) REFERENCES public.cobra_motor_calib(cobra_motor_calib_id);


--
-- Name: cobra_movement cobra_movement_mcs_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_movement
    ADD CONSTRAINT cobra_movement_mcs_frame_id_fkey FOREIGN KEY (mcs_frame_id, cobra_id) REFERENCES public.cobra_status(mcs_frame_id, cobra_id);


--
-- Name: cobra cobra_sps_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra
    ADD CONSTRAINT cobra_sps_camera_id_fkey FOREIGN KEY (sps_camera_id) REFERENCES public.sps_camera(sps_camera_id);


--
-- Name: cobra_status cobra_status_mcs_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.cobra_status
    ADD CONSTRAINT cobra_status_mcs_frame_id_fkey FOREIGN KEY (mcs_frame_id, spot_id) REFERENCES public.mcs_data(mcs_frame_id, spot_id);


--
-- Name: drp1d_line drp1d_line_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_line
    ADD CONSTRAINT drp1d_line_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line_list(line_id);


--
-- Name: drp1d_line drp1d_line_pfs_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_line
    ADD CONSTRAINT drp1d_line_pfs_object_id_fkey FOREIGN KEY (pfs_object_id, processed_at) REFERENCES public.drp1d(pfs_object_id, processed_at);


--
-- Name: drp1d drp1d_obj_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d
    ADD CONSTRAINT drp1d_obj_type_id_fkey FOREIGN KEY (obj_type_id) REFERENCES public.obj_type(obj_type_id);


--
-- Name: drp1d drp1d_pfs_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d
    ADD CONSTRAINT drp1d_pfs_object_id_fkey FOREIGN KEY (pfs_object_id) REFERENCES public.pfs_object(pfs_object_id);


--
-- Name: drp1d_redshift drp1d_redshift_pfs_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp1d_redshift
    ADD CONSTRAINT drp1d_redshift_pfs_object_id_fkey FOREIGN KEY (pfs_object_id, processed_at) REFERENCES public.drp1d(pfs_object_id, processed_at);


--
-- Name: drp_ga drp_ga_pfs_object_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp_ga
    ADD CONSTRAINT drp_ga_pfs_object_id_fkey FOREIGN KEY (pfs_object_id) REFERENCES public.pfs_object(pfs_object_id);


--
-- Name: drp_ga drp_ga_star_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.drp_ga
    ADD CONSTRAINT drp_ga_star_type_id_fkey FOREIGN KEY (star_type_id) REFERENCES public.star_type(star_type_id);


--
-- Name: fiducial_fiber_geometry fiducial_fiber_geometry_fiducial_fiber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.fiducial_fiber_geometry
    ADD CONSTRAINT fiducial_fiber_geometry_fiducial_fiber_id_fkey FOREIGN KEY (fiducial_fiber_id) REFERENCES public.fiducial_fiber(fiducial_fiber_id);


--
-- Name: guide_stars guide_stars_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.guide_stars
    ADD CONSTRAINT guide_stars_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.input_catalog(cat_id);


--
-- Name: guide_stars guide_stars_obj_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.guide_stars
    ADD CONSTRAINT guide_stars_obj_type_id_fkey FOREIGN KEY (obj_type_id) REFERENCES public.obj_type(obj_type_id);


--
-- Name: mcs_boresight mcs_boresight_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_boresight
    ADD CONSTRAINT mcs_boresight_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: mcs_data mcs_data_mcs_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_data
    ADD CONSTRAINT mcs_data_mcs_frame_id_fkey FOREIGN KEY (mcs_frame_id) REFERENCES public.mcs_exposure(mcs_frame_id);


--
-- Name: mcs_exposure mcs_exposure_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.mcs_exposure
    ADD CONSTRAINT mcs_exposure_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: obs_fiber obs_fiber_cobra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obs_fiber
    ADD CONSTRAINT obs_fiber_cobra_id_fkey FOREIGN KEY (cobra_id) REFERENCES public.cobra(cobra_id);


--
-- Name: obs_fiber obs_fiber_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obs_fiber
    ADD CONSTRAINT obs_fiber_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: obslog_mcs_exposure_note obslog_mcs_exposure_note_mcs_exposure_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_mcs_exposure_note
    ADD CONSTRAINT obslog_mcs_exposure_note_mcs_exposure_frame_id_fkey FOREIGN KEY (mcs_exposure_frame_id) REFERENCES public.mcs_exposure(mcs_frame_id);


--
-- Name: obslog_mcs_exposure_note obslog_mcs_exposure_note_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_mcs_exposure_note
    ADD CONSTRAINT obslog_mcs_exposure_note_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.obslog_user(id);


--
-- Name: obslog_visit_note obslog_visit_note_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_note
    ADD CONSTRAINT obslog_visit_note_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: obslog_visit_note obslog_visit_note_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_note
    ADD CONSTRAINT obslog_visit_note_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.obslog_user(id);


--
-- Name: obslog_visit_set_note obslog_visit_set_note_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_set_note
    ADD CONSTRAINT obslog_visit_set_note_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.obslog_user(id);


--
-- Name: obslog_visit_set_note obslog_visit_set_note_visit_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.obslog_visit_set_note
    ADD CONSTRAINT obslog_visit_set_note_visit_set_id_fkey FOREIGN KEY (visit_set_id) REFERENCES public.sps_sequence(visit_set_id);


--
-- Name: pfs_arm pfs_arm_calib_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_calib_set_id_fkey FOREIGN KEY (calib_set_id) REFERENCES public.calib_set(calib_set_id);


--
-- Name: pfs_arm_obj pfs_arm_obj_cobra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm_obj
    ADD CONSTRAINT pfs_arm_obj_cobra_id_fkey FOREIGN KEY (cobra_id) REFERENCES public.cobra(cobra_id);


--
-- Name: pfs_arm_obj pfs_arm_obj_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm_obj
    ADD CONSTRAINT pfs_arm_obj_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: pfs_arm_obj pfs_arm_obj_qa_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm_obj
    ADD CONSTRAINT pfs_arm_obj_qa_type_id_fkey FOREIGN KEY (qa_type_id) REFERENCES public.qa_type(qa_type_id);


--
-- Name: pfs_arm pfs_arm_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: pfs_arm pfs_arm_psf_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_psf_model_id_fkey FOREIGN KEY (psf_model_id) REFERENCES public.psf_model(psf_model_id);


--
-- Name: pfs_arm pfs_arm_sky_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_arm
    ADD CONSTRAINT pfs_arm_sky_model_id_fkey FOREIGN KEY (sky_model_id) REFERENCES public.sky_model(sky_model_id);


--
-- Name: pfs_config_fiber pfs_config_fiber_cobra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config_fiber
    ADD CONSTRAINT pfs_config_fiber_cobra_id_fkey FOREIGN KEY (cobra_id) REFERENCES public.cobra(cobra_id);


--
-- Name: pfs_config_fiber pfs_config_fiber_pfs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config_fiber
    ADD CONSTRAINT pfs_config_fiber_pfs_config_id_fkey FOREIGN KEY (pfs_config_id) REFERENCES public.pfs_config(pfs_config_id);


--
-- Name: pfs_config_fiber pfs_config_fiber_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config_fiber
    ADD CONSTRAINT pfs_config_fiber_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.target(target_id);


--
-- Name: pfs_config pfs_config_pfs_design_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_config
    ADD CONSTRAINT pfs_config_pfs_design_id_fkey FOREIGN KEY (pfs_design_id) REFERENCES public.pfs_design(pfs_design_id);


--
-- Name: pfs_design_fiber pfs_design_fiber_cobra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design_fiber
    ADD CONSTRAINT pfs_design_fiber_cobra_id_fkey FOREIGN KEY (cobra_id) REFERENCES public.cobra(cobra_id);


--
-- Name: pfs_design_fiber pfs_design_fiber_pfs_design_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design_fiber
    ADD CONSTRAINT pfs_design_fiber_pfs_design_id_fkey FOREIGN KEY (pfs_design_id) REFERENCES public.pfs_design(pfs_design_id);


--
-- Name: pfs_design_fiber pfs_design_fiber_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design_fiber
    ADD CONSTRAINT pfs_design_fiber_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.target(target_id);


--
-- Name: pfs_design pfs_design_tile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_design
    ADD CONSTRAINT pfs_design_tile_id_fkey FOREIGN KEY (tile_id) REFERENCES public.tile(tile_id);


--
-- Name: pfs_object pfs_object_flux_calib_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_flux_calib_id_fkey FOREIGN KEY (flux_calib_id) REFERENCES public.flux_calib(flux_calib_id);


--
-- Name: pfs_object pfs_object_pfs_visit_hash_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_pfs_visit_hash_fkey FOREIGN KEY (pfs_visit_hash) REFERENCES public.visit_hash(pfs_visit_hash);


--
-- Name: pfs_object pfs_object_qa_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_qa_type_id_fkey FOREIGN KEY (qa_type_id) REFERENCES public.qa_type(qa_type_id);


--
-- Name: pfs_object pfs_object_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.pfs_object
    ADD CONSTRAINT pfs_object_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.target(target_id);


--
-- Name: processing_status processing_status_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.processing_status
    ADD CONSTRAINT processing_status_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: processing_status processing_status_visit_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.processing_status
    ADD CONSTRAINT processing_status_visit_set_id_fkey FOREIGN KEY (visit_set_id) REFERENCES public.sps_sequence(visit_set_id);


--
-- Name: program program_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposal(proposal_id);


--
-- Name: psf_model psf_model_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.psf_model
    ADD CONSTRAINT psf_model_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: psf_model psf_model_sps_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.psf_model
    ADD CONSTRAINT psf_model_sps_camera_id_fkey FOREIGN KEY (sps_camera_id) REFERENCES public.sps_camera(sps_camera_id);


--
-- Name: sky_model sky_model_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sky_model
    ADD CONSTRAINT sky_model_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: sky_model sky_model_sps_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sky_model
    ADD CONSTRAINT sky_model_sps_camera_id_fkey FOREIGN KEY (sps_camera_id) REFERENCES public.sps_camera(sps_camera_id);


--
-- Name: sps_annotation sps_annotation_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_annotation
    ADD CONSTRAINT sps_annotation_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id, sps_camera_id) REFERENCES public.sps_exposure(pfs_visit_id, sps_camera_id);


--
-- Name: sps_camera sps_camera_sps_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_camera
    ADD CONSTRAINT sps_camera_sps_module_id_fkey FOREIGN KEY (sps_module_id) REFERENCES public.sps_module(sps_module_id);


--
-- Name: sps_condition sps_condition_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_condition
    ADD CONSTRAINT sps_condition_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id, sps_camera_id) REFERENCES public.sps_exposure(pfs_visit_id, sps_camera_id);


--
-- Name: sps_exposure sps_exposure_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_exposure
    ADD CONSTRAINT sps_exposure_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.sps_visit(pfs_visit_id);


--
-- Name: sps_exposure sps_exposure_sps_camera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_exposure
    ADD CONSTRAINT sps_exposure_sps_camera_id_fkey FOREIGN KEY (sps_camera_id) REFERENCES public.sps_camera(sps_camera_id);


--
-- Name: sps_visit sps_visit_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.sps_visit
    ADD CONSTRAINT sps_visit_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- Name: target target_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.input_catalog(cat_id);


--
-- Name: target target_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(program_id);


--
-- Name: target target_qa_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_qa_type_id_fkey FOREIGN KEY (qa_type_id) REFERENCES public.qa_type(qa_type_id);


--
-- Name: target target_target_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_target_type_id_fkey FOREIGN KEY (target_type_id) REFERENCES public.target_type(target_type_id);


--
-- Name: tel_condition tel_condition_cloud_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_condition
    ADD CONSTRAINT tel_condition_cloud_condition_id_fkey FOREIGN KEY (cloud_condition_id) REFERENCES public.cloud_condition(cloud_condition_id);


--
-- Name: tel_condition tel_condition_tel_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_condition
    ADD CONSTRAINT tel_condition_tel_visit_id_fkey FOREIGN KEY (tel_visit_id) REFERENCES public.tel_visit(tel_visit_id);


--
-- Name: tel_visit tel_visit_beam_switch_mode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_visit
    ADD CONSTRAINT tel_visit_beam_switch_mode_id_fkey FOREIGN KEY (beam_switch_mode_id) REFERENCES public.beam_switch_mode(beam_switch_mode_id);


--
-- Name: tel_visit tel_visit_pfs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tel_visit
    ADD CONSTRAINT tel_visit_pfs_config_id_fkey FOREIGN KEY (pfs_config_id) REFERENCES public.pfs_config(pfs_config_id);


--
-- Name: tile tile_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.tile
    ADD CONSTRAINT tile_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(program_id);


--
-- Name: visit_set visit_set_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_set
    ADD CONSTRAINT visit_set_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.sps_visit(pfs_visit_id);


--
-- Name: visit_set visit_set_visit_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visit_set
    ADD CONSTRAINT visit_set_visit_set_id_fkey FOREIGN KEY (visit_set_id) REFERENCES public.sps_sequence(visit_set_id);


--
-- Name: visits_to_combine visits_to_combine_pfs_visit_hash_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visits_to_combine
    ADD CONSTRAINT visits_to_combine_pfs_visit_hash_fkey FOREIGN KEY (pfs_visit_hash) REFERENCES public.visit_hash(pfs_visit_hash);


--
-- Name: visits_to_combine visits_to_combine_pfs_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: michitaro
--

ALTER TABLE ONLY public.visits_to_combine
    ADD CONSTRAINT visits_to_combine_pfs_visit_id_fkey FOREIGN KEY (pfs_visit_id) REFERENCES public.pfs_visit(pfs_visit_id);


--
-- PostgreSQL database dump complete
--

